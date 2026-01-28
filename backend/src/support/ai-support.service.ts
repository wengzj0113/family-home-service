import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface AiChatPayload {
  message: string;
  orderId?: number;
  category?: string;
}

@Injectable()
export class AiSupportService {
  private readonly logger = new Logger(AiSupportService.name);

  /**
   * AI 客服统一入口。
   * 优先调用 DeepSeek 聊天接口；当未配置 API Key 或调用失败时，
   * 回退到本地规则/关键词驱动的“简易 AI”以保证功能可用。
   */
  async generateReply(userId: number, payload: AiChatPayload) {
    const question = (payload.message || '').trim();

    if (!question) {
      return {
        reply: '您好，我是智能客服小帮手，请先简单描述一下您的问题，例如：“想取消今天的订单” 或 “优惠券为什么不能用”。',
      };
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;

    // 优先尝试 DeepSeek
    if (apiKey) {
      try {
        const deepseekReply = await this.callDeepSeek(apiKey, question, payload);
        if (deepseekReply) {
          return { reply: deepseekReply };
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error?.message || err.message || err;
        this.logger.error(`DeepSeek 调用失败: ${errorMsg}`);
        // 不中断，继续走本地规则逻辑
      }
    }

    const lower = question.toLowerCase();

    // 订单相关
    if (this.includesAny(lower, ['取消订单', '退单', '改时间', '改预约', '改期', '时间'])) {
      return {
        reply:
          '关于订单时间与取消规则：\n' +
          '1）在师傅接单前，您可以直接在“我的订单”中取消，费用全额退回；\n' +
          '2）师傅接单后、已出发前，取消可能会收取一定违约金，具体以订单页面为准；\n' +
          '3）若需要改期，可在订单详情中点击“联系客服”，由人工客服为您处理改期或协调师傅；\n' +
          '如本次咨询的是具体订单，您也可以在该订单详情页直接发起售后/问题反馈。',
      };
    }

    // 费用与优惠券
    if (this.includesAny(lower, ['优惠券', '代金券', '折扣', '满减', '活动'])) {
      return {
        reply:
          '关于优惠券使用说明：\n' +
          '1）下单时系统会自动识别当前金额可使用的优惠券，您可以在“优惠券”入口查看详情；\n' +
          '2）部分优惠券仅限指定服务品类或指定时间段使用；\n' +
          '3）如您发现优惠券无法使用，建议检查是否满足金额门槛、有效期及服务类型限制；\n' +
          '如仍有疑问，可以在订单详情中选择“联系客服”，由人工为您进一步核实。',
      };
    }

    // 钱包与提现
    if (this.includesAny(lower, ['钱包', '余额', '提现', '到账', '佣金'])) {
      return {
        reply:
          '关于钱包与提现：\n' +
          '1）客户支付后的金额会先进入平台结算账户，订单完成并支付成功后再结算给师傅；\n' +
          '2）师傅可在“我的-钱包”中查看可提现余额，并发起提现申请；\n' +
          '3）提现审核通过后，一般会在 1-3 个工作日内到账，具体以银行/支付渠道为准；\n' +
          '如提现超过预期未到账，请在零钱/提现详情中发起“帮助与客服”工单，我们会为您人工核查。',
      };
    }

    // 服务质量/投诉
    if (this.includesAny(lower, ['投诉', '差评', '不满意', '损坏', '赔偿', '赔付'])) {
      return {
        reply:
          '非常抱歉给您带来不好的体验。关于服务质量与赔付：\n' +
          '1）您可以在订单完成后通过“去评价”为本次服务打分并留下文字评价；\n' +
          '2）若存在物品损坏、服务严重不达标等情况，请在订单详情中点击“申请售后/问题反馈”，详细说明问题并上传照片；\n' +
          '3）平台客服会在收到工单后尽快与您联系，根据服务协议和保险条款为您处理赔付或再次服务；\n' +
          '如情况紧急，建议同时通过“在线客服”与人工客服联系，以便优先处理。',
      };
    }

    // 服务范围与报价
    if (this.includesAny(lower, ['服务范围', '打扫什么', '不包含', '报价', '价格', '收费'])) {
      return {
        reply:
          '关于服务范围与收费说明：\n' +
          '1）不同服务品类（如日常保洁、深度清洁、家电清洗）有对应的服务标准与不包含项目，您可以在下单页选择服务类型时查看详情；\n' +
          '2）平台会根据服务时长、面积、设备数量等综合计算报价，具体价格以下单页展示为准；\n' +
          '3）如师傅现场评估后需调整服务内容和价格，应在您确认同意后再开始服务；\n' +
          '若您对当前订单的价格和服务范围有疑问，建议在订单详情中发起“联系客服”，我们会协助核实。',
      };
    }

    // 默认回答（本地规则兜底）
    if (this.includesAny(lower, ['当师傅', '做师傅', '加入', '入驻', '赚钱', '兼职', '招人', '招聘'])) {
      return {
        reply:
          '欢迎加入“好帮手”师傅团队！\n' +
          '1）入驻流程：在个人中心点击“成为师傅”，按要求提交身份信息、技能证书及健康证；\n' +
          '2）审核时间：资料提交后，平台会在 1-3 个工作日内完成实名审核和背景调查；\n' +
          '3）开始接单：审核通过后，您需要参加线上/线下培训，完成考核后即可在“抢单池”开始接单赚钱；\n' +
          '如果您在申请过程中遇到问题，可以点击“联系客服”提交入驻咨询工单。',
      };
    }

    return {
      reply:
        '我已经收到您的问题：\n“' +
        question +
        '”\n\n' +
        '目前我可以为您解答常见的下单、改期、费用、优惠券、钱包提现、服务范围和投诉流程相关问题。\n' +
        '如果我的回复无法完全解决您的问题，您可以在当前页面继续追问，或者点击“人工客服/提交工单”由工作人员为您进一步处理。',
    };
  }

  private includesAny(text: string, keywords: string[]): boolean {
    return keywords.some((k) => text.includes(k.toLowerCase()));
  }

  /**
   * 调用 DeepSeek Chat Completion API。
   * 文档参考：https://api-docs.deepseek.com/
   */
  private async callDeepSeek(
    apiKey: string,
    question: string,
    payload: AiChatPayload,
  ): Promise<string | null> {
    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    const systemPrompt =
      '你是“好帮手”家政服务平台的资深客服专员。' +
      '用户提问时，请**直接、具体地回答问题本身**，优先给出可执行的步骤或建议，而不是泛泛而谈。' +
      '你熟悉的平台业务包括：下单流程、改期与取消规则、费用与优惠券、钱包余额与提现、师傅结算与等级、服务范围与标准、服务质量投诉与赔付流程等。' +
      '回答要求：\n' +
      '1）使用简体中文，语气专业但亲切；\n' +
      '2）尽量结合家政场景举例（如日常保洁、深度清洁、家电清洗、搬家等）；\n' +
      '3）如果问题涉及“如何操作”，请按 1-2-3 列出步骤；\n' +
      '4）不要编造本系统中不存在的模块或入口，如果不确定，请建议用户通过“帮助与客服/提交工单”联系人工。';

    const userContextParts: string[] = [question];
    if (payload.orderId) {
      userContextParts.push(`（关联订单ID：${payload.orderId}）`);
    }
    if (payload.category) {
      userContextParts.push(`（问题分类：${payload.category}）`);
    }

    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContextParts.join(' ') },
      ],
      max_tokens: 512,
      temperature: 0.3,
    };

    const resp = await axios.post(
      `${baseUrl}/chat/completions`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 25000,
      },
    );

    const reply = resp.data?.choices?.[0]?.message?.content;
    return typeof reply === 'string' ? reply.trim() : null;
  }
}
