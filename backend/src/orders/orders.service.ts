import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { Rating, RatingRole } from '../ratings/entities/rating.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { UserCoupon } from '../coupons/entities/user-coupon.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(Rating)
    private ratingsRepository: Repository<Rating>,
    private transactionsService: TransactionsService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  async create(customerId: number, orderData: Partial<Order>): Promise<Order> {
    const order = this.ordersRepository.create({
      ...orderData,
      customerId,
      orderNo: `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
      status: OrderStatus.PENDING,
    });

    // 智能派单
    try {
      const nearby = await this.dataSource.manager.createQueryBuilder(User, 'u')
        .where('u.roles LIKE :r', { r: '%worker%' })
        .andWhere('u.lat IS NOT NULL')
        .orderBy('u.workerScore', 'DESC').limit(1).getOne();
      if (nearby) order.recommendWorkerId = nearby.id;
    } catch (e) {}

    const savedOrder = await this.ordersRepository.save(order);

    // 如果使用了优惠券，将优惠券设为已使用
    if (orderData.userCouponId) {
      await this.dataSource.manager.update('user_coupons', 
        { id: orderData.userCouponId }, 
        { status: 1, orderId: savedOrder.id, usedAt: new Date() }
      );
    }

    return savedOrder;
  }

  async findById(id: number): Promise<Order> {
    return this.ordersRepository.findOne({ where: { id }, relations: ['customer', 'worker'] });
  }

  async depart(orderId: number, workerId: number): Promise<Order> {
    const order = await this.findById(orderId);
    if (!order || order.workerId !== workerId) throw new BadRequestException('订单不存在或无权操作');
    if (order.status !== OrderStatus.GRABBED) throw new BadRequestException('当前状态无法出发');
    
    order.status = OrderStatus.DEPARTED;
    const saved = await this.ordersRepository.save(order);
    
    await this.notificationsService.create(
      order.customerId,
      '师傅已出发',
      `您的订单 ${order.orderNo}，师傅已出发，请保持电话畅通。`,
      NotificationType.ORDER,
    );
    return saved;
  }

  async arrive(orderId: number, workerId: number, lat?: number, lng?: number): Promise<Order> {
    const order = await this.findById(orderId);
    if (!order || order.workerId !== workerId) throw new BadRequestException('订单不存在或无权操作');
    if (order.status !== OrderStatus.DEPARTED) throw new BadRequestException('当前状态无法到达');
    
    // 地理围栏验证（模拟）
    if (lat && lng && order.lat && order.lng) {
      const dist = Math.sqrt(Math.pow(lat - order.lat, 2) + Math.pow(lng - order.lng, 2));
      console.log(`Arrive verification: distance is ${dist}`);
    }

    order.status = OrderStatus.ARRIVED;
    const saved = await this.ordersRepository.save(order);

    await this.notificationsService.create(
      order.customerId,
      '师傅已到达',
      `师傅已到达您的服务地址，准备开始服务。`,
      NotificationType.ORDER,
    );
    return saved;
  }

  async startService(orderId: number, workerId: number): Promise<Order> {
    const order = await this.findById(orderId);
    if (!order || order.workerId !== workerId) throw new BadRequestException('订单不存在或无权操作');
    if (order.status !== OrderStatus.ARRIVED) throw new BadRequestException('当前状态无法开始服务');
    
    order.status = OrderStatus.STARTED;
    const saved = await this.ordersRepository.save(order);

    await this.notificationsService.create(
      order.customerId,
      '服务已开始',
      `您的订单 ${order.orderNo} 已正式开始服务。`,
      NotificationType.ORDER,
    );
    return saved;
  }

  async findAllPending(query?: any): Promise<Order[]> {
    const { lat, lng, radius, sort } = query || {};
    const qb = this.ordersRepository.createQueryBuilder('order');
    qb.leftJoinAndSelect('order.customer', 'customer');
    qb.where('order.status = :status', { status: OrderStatus.PENDING });

    // 1. Geolocation filtering
    if (lat && lng && radius) {
      qb.andWhere(
        'ST_Distance_Sphere(point(order.lng, order.lat), point(:lng, :lat)) <= :radius',
        { lng, lat, radius: radius * 1000 }, // radius in km to meters
      );
    }

    // 2. Add distance column if coordinates provided
    if (lat && lng) {
      qb.addSelect(
        'ST_Distance_Sphere(point(order.lng, order.lat), point(:lng, :lat))',
        'distance',
      );
    }

    // 3. Sorting
    if (sort === 'distance' && lat && lng) {
      qb.orderBy('distance', 'ASC');
    } else if (sort === 'price') {
      qb.orderBy('order.amount', 'DESC');
    } else if (sort === 'rating') {
      // Order by customer score
      qb.orderBy('customer.customerScore', 'DESC');
    } else {
      qb.orderBy('order.createdAt', 'DESC');
    }

    const orders = await qb.getMany();
    
    // If we have distance, we might want to attach it to the response object
    // getMany() won't include the virtual 'distance' column automatically
    if (lat && lng) {
      const rawOrders = await qb.getRawAndEntities();
      return rawOrders.entities.map((entity, index) => {
        const raw = rawOrders.raw[index];
        (entity as any).distance = Math.round(raw.distance);
        return entity;
      });
    }

    return orders;
  }

  async findAllAdmin(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['customer', 'worker'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateCompletedItems(id: number, workerId: number, items: string) {
    const order = await this.ordersRepository.findOne({ where: { id, workerId } });
    if (!order) throw new BadRequestException('订单不存在或无权操作');
    if (order.status !== OrderStatus.STARTED) throw new BadRequestException('只有服务中的订单可以更新清单');
    
    await this.ordersRepository.update(id, { completedItems: items });
    return { success: true };
  }

  async findByUser(userId: number, roles: string[]): Promise<Order[]> {
    // 简单逻辑：如果用户既是客户也是师傅，目前返回全部相关订单（实际可以根据前端传参过滤）
    const conditions = [];
    const roleArray = Array.isArray(roles) ? roles : (typeof roles === 'string' ? (roles as string).split(',') : []);
    
    if (roleArray.includes('worker')) {
      conditions.push({ workerId: userId });
    }
    if (roleArray.includes('customer')) {
      conditions.push({ customerId: userId });
    }
    
    return this.ordersRepository.find({
      where: conditions,
      order: { createdAt: 'DESC' },
    });
  }

  async trackOrder(orderId: number, userId: number) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['worker'],
    });

    if (!order) throw new NotFoundException('订单不存在');
    if (order.customerId !== userId) throw new BadRequestException('无权查看此订单');
    
    // 如果没有师傅接单，返回基本状态
    if (!order.workerId || !order.worker) {
      return { 
        status: order.status, 
        message: '师傅尚未接单',
        orderLocation: { lat: order.lat, lng: order.lng }
      };
    }

    const workerLat = Number(order.worker.lat);
    const workerLng = Number(order.worker.lng);
    const orderLat = Number(order.lat);
    const orderLng = Number(order.lng);

    // 如果位置缺失
    if (!workerLat || !workerLng || !orderLat || !orderLng) {
      return { 
        status: order.status, 
        workerLocation: workerLat ? { lat: workerLat, lng: workerLng } : null,
        orderLocation: { lat: orderLat, lng: orderLng },
        message: '正在获取师傅位置...' 
      };
    }

    // 粗略计算直线距离 (KM)
    // 1度纬度约111km
    const latDiff = (workerLat - orderLat) * 111;
    const lngDiff = (workerLng - orderLng) * 111 * Math.cos(orderLat * Math.PI / 180);
    const distance = Math.sqrt(Math.pow(latDiff, 2) + Math.pow(lngDiff, 2));

    // 模拟 ETA: 假设师傅平均时速 30km/h (约 0.5km/min)
    const etaMinutes = Math.ceil(distance / 0.5);

    return {
      status: order.status,
      workerLocation: { lat: workerLat, lng: workerLng },
      orderLocation: { lat: orderLat, lng: orderLng },
      distance: parseFloat(distance.toFixed(2)), // 公里
      etaMinutes: etaMinutes, // 分钟
      message: order.status === OrderStatus.DEPARTED ? '师傅正赶往您的地址' : 
               order.status === OrderStatus.ARRIVED ? '师傅已到达' : '师傅已接单'
    };
  }

  async grabOrder(orderId: number, workerId: number): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the row for update
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Order has already been grabbed');
      }

      order.workerId = workerId;
      order.status = OrderStatus.GRABBED;
      const savedOrder = await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();

      // 通知客户订单已被抢
      await this.notificationsService.create(
        order.customerId,
        '您的订单已被抢',
        `订单 ${order.orderNo} 已由服务人员接单，请耐心等待服务。`,
        NotificationType.ORDER,
      );

      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async completeOrder(orderId: number, userId: number, ratingData?: { score?: number, content?: string }): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    
    if (order.workerId !== userId && order.customerId !== userId) {
      throw new BadRequestException('Unauthorized');
    }
    
    if (order.status !== OrderStatus.STARTED && order.status !== OrderStatus.GRABBED) {
      throw new BadRequestException('订单当前状态无法确认完成（请先开始服务）');
    }

    // 师傅必须评分
    if (order.workerId === userId && (!ratingData || !ratingData.score)) {
      throw new BadRequestException('师傅必须评价用户后才能完成订单');
    }
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update Order Status
      order.status = OrderStatus.COMPLETED;
      await queryRunner.manager.save(order);

      // 2. Handle Rating if provided
      if (ratingData && ratingData.score) {
        const isWorker = userId === order.workerId;
        const rating = this.ratingsRepository.create({
          orderId,
          fromUserId: userId,
          toUserId: isWorker ? order.customerId : order.workerId,
          role: isWorker ? RatingRole.WORKER_TO_CUSTOMER : RatingRole.CUSTOMER_TO_WORKER,
          score: ratingData.score || 5,
          content: ratingData.content || '默认好评',
        });
        await queryRunner.manager.save(rating);

        // Update target user scores & Level (Keep logic consistent with RatingsService)
        const targetUser = await queryRunner.manager.findOne(User, { where: { id: rating.toUserId } });
        if (targetUser) {
          // Calculate new average
          const stats = await queryRunner.manager
            .createQueryBuilder(Rating, 'r')
            .where('r.to_user_id = :toUserId AND r.role = :role', { 
              toUserId: rating.toUserId, 
              role: rating.role 
            })
            .select('AVG(r.score)', 'avg')
            .addSelect('COUNT(r.id)', 'count')
            .getRawOne();
          
          const newAvg = (parseFloat(stats.avg || 0) * parseInt(stats.count || 0) + rating.score) / (parseInt(stats.count || 0) + 1);
          const newCount = parseInt(stats.count || 0) + 1;

          if (rating.role === RatingRole.CUSTOMER_TO_WORKER) {
            targetUser.workerScore = parseFloat(newAvg.toFixed(2));
          } else {
            targetUser.customerScore = parseFloat(newAvg.toFixed(2));
          }
          targetUser.ratingCount = newCount;
          targetUser.exp = (targetUser.exp || 0) + 10;
          targetUser.points = (targetUser.points || 0) + Math.floor(order.amount / 10);

          // Leveling logic
          const currentScore = rating.role === RatingRole.CUSTOMER_TO_WORKER ? targetUser.workerScore : targetUser.customerScore;
          if (currentScore >= 4.8 && newCount >= 50) targetUser.level = 5;
          else if (currentScore >= 4.5 && newCount >= 20) targetUser.level = 4;
          else if (currentScore >= 4.0 && newCount >= 10) targetUser.level = 3;
          else if (currentScore < 3.0) targetUser.level = 1;
          else targetUser.level = 2;

          await queryRunner.manager.save(targetUser);
        }
      }

      await queryRunner.commitTransaction();

      // 邀请奖励逻辑：如果该客户是被邀请的，且这是首单完成，给双方发券
      if (order.status === OrderStatus.COMPLETED) {
        const customer = await this.usersService.findById(order.customerId);
        if (customer && customer.invitedById) {
          const completedCount = await this.ordersRepository.count({
            where: { customerId: order.customerId, status: OrderStatus.COMPLETED }
          });
          if (completedCount === 1) {
            // 首单完成，发放 10 元奖励券
            const coupon = await this.dataSource.manager.findOne(Coupon, { where: { amount: 10 } });
            if (coupon) {
              // 给邀请人发券
              await this.dataSource.manager.insert(UserCoupon, {
                userId: customer.invitedById,
                couponId: coupon.id,
                status: 0
              });
              // 给被邀请人发券
              await this.dataSource.manager.insert(UserCoupon, {
                userId: customer.id,
                couponId: coupon.id,
                status: 0
              });
              
              // 通知
              await this.notificationsService.create(customer.invitedById, '获得邀请奖励', '您邀请的好友已完成首单，您获得了一张10元优惠券！');
              await this.notificationsService.create(customer.id, '获得新人奖励', '感谢完成首单，送您一张10元优惠券，下次下单可用！');
            }
          }
        }
      }

      // 通知另一方订单已完成
      const isWorker = userId === order.workerId;
      await this.notificationsService.create(
        isWorker ? order.customerId : order.workerId,
        '订单已确认完成',
        `订单 ${order.orderNo} 已由对方确认完成。`,
        NotificationType.ORDER,
      );

      // 注释掉自动结算，改为支付后触发结算
      /*
      try {
        await this.transactionsService.settleOrder(orderId);
      } catch (err) {
        console.error('Settlement failed:', err);
      }
      */

      return order;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
