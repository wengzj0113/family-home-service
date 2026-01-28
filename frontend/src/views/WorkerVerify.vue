<template>
  <div class="page-container">
    <div class="nav-header">
      <i class="ri-arrow-left-s-line" @click="$router.back()"></i>
      <span>服务人员认证</span>
      <div style="width: 24px;"></div>
    </div>

    <div class="form-content">
      <!-- 隐藏的文件上传 input -->
      <input type="file" ref="fileInput" style="display: none" accept="image/*" @change="onFileChange" />

      <div class="alert-box">
        <i class="ri-information-line"></i>
        <span>通过身份认证后，您将获得优先派单权和更高的收益比例。</span>
      </div>

      <div class="form-section">
        <label>真实姓名</label>
        <div class="input-group">
          <input type="text" v-model="form.realName" placeholder="请输入身份证姓名" />
        </div>
      </div>

      <div class="form-section">
        <label>身份证号</label>
        <div class="input-group">
          <input type="text" v-model="form.idCardNo" placeholder="请输入18位身份证号" />
        </div>
      </div>

      <div class="form-section">
        <label>上传证件照片 (单张不超过5MB)</label>
        <div class="upload-grid">
          <div :class="['upload-item', uploaded.front ? 'done' : '', uploadLoading.front ? 'loading' : '']" @click="handleUpload('front')">
            <div v-if="uploaded.front" class="preview-box">
              <img :src="getImageUrl(form.idCardFront)" class="preview" />
              <div class="remove-btn" @click.stop="removeImage('front')">
                <i class="ri-close-circle-fill"></i>
              </div>
            </div>
            <template v-else>
              <i v-if="uploadLoading.front" class="ri-loader-4-line spin"></i>
              <i v-else class="ri-add-line"></i>
              <span>身份证正面</span>
            </template>
          </div>
          <div :class="['upload-item', uploaded.back ? 'done' : '', uploadLoading.back ? 'loading' : '']" @click="handleUpload('back')">
            <div v-if="uploaded.back" class="preview-box">
              <img :src="getImageUrl(form.idCardBack)" class="preview" />
              <div class="remove-btn" @click.stop="removeImage('back')">
                <i class="ri-close-circle-fill"></i>
              </div>
            </div>
            <template v-else>
              <i v-if="uploadLoading.back" class="ri-loader-4-line spin"></i>
              <i v-else class="ri-add-line"></i>
              <span>身份证反面</span>
            </template>
          </div>
          <div :class="['upload-item', uploaded.hand ? 'done' : '', uploadLoading.hand ? 'loading' : '']" @click="handleUpload('hand')">
            <div v-if="uploaded.hand" class="preview-box">
              <img :src="getImageUrl(form.idCardHand)" class="preview" />
              <div class="remove-btn" @click.stop="removeImage('hand')">
                <i class="ri-close-circle-fill"></i>
              </div>
            </div>
            <template v-else>
              <i v-if="uploadLoading.hand" class="ri-loader-4-line spin"></i>
              <i v-else class="ri-add-line"></i>
              <span>手持证件照</span>
            </template>
          </div>
          <div :class="['upload-item', uploaded.health ? 'done' : '', uploadLoading.health ? 'loading' : '']" @click="handleUpload('health')">
            <div v-if="uploaded.health" class="preview-box">
              <img :src="getImageUrl(form.healthCertificate)" class="preview" />
              <div class="remove-btn" @click.stop="removeImage('health')">
                <i class="ri-close-circle-fill"></i>
              </div>
            </div>
            <template v-else>
              <i v-if="uploadLoading.health" class="ri-loader-4-line spin"></i>
              <i v-else class="ri-add-line"></i>
              <span>健康证</span>
            </template>
          </div>
        </div>
      </div>

      <div class="form-section">
        <label>从业年限 (年)</label>
        <div class="input-group">
          <input type="number" v-model="form.experience" placeholder="请输入从业年限" />
        </div>
      </div>

      <div class="form-section">
        <label>自我介绍</label>
        <textarea v-model="form.introduction" placeholder="介绍一下您的服务优势..."></textarea>
      </div>

      <div class="form-section">
        <label>专业技能 (多选)</label>
        <div class="skill-tags">
          <span 
            v-for="s in skills" 
            :key="s" 
            :class="['tag', form.skills.includes(s) ? 'active' : '']"
            @click="toggleSkill(s)"
          >
            {{ s }}
          </span>
        </div>
      </div>

      <button class="submit-btn" @click="handleSubmit" :disabled="submitting">
        <span v-if="!submitting">提交认证</span>
        <span v-else><i class="ri-loader-4-line spin"></i> 提交中...</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();
const submitting = ref(false);
const fileInput = ref(null);
const currentUploadType = ref('');
const uploadLoading = reactive({
  front: false,
  back: false,
  hand: false,
  health: false
});

const skills = ['精细保洁', '厨卫去油', '甲醛检测', '搬家力工', '管道疏通', '家电拆洗'];

const uploaded = reactive({
  front: false,
  back: false,
  hand: false,
  health: false
});

const form = reactive({
  realName: '',
  idCardNo: '',
  experience: '',
  introduction: '',
  skills: [],
  idCardFront: '',
  idCardBack: '',
  idCardHand: '',
  healthCertificate: ''
});

const handleUpload = (type) => {
  currentUploadType.value = type;
  fileInput.value.click();
};

const onFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // 1. 检查类型
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件');
    return;
  }

  const type = currentUploadType.value;
  uploadLoading[type] = true;

  try {
    // 2. 压缩图片 (如果超过 1MB)
    let fileToUpload = file;
    if (file.size > 1024 * 1024) {
      fileToUpload = await compressImage(file);
    }

    // 3. 上传到后台
    const formData = new FormData();
    formData.append('file', fileToUpload);

    const res = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (res.data.url) {
      const fieldMap = {
        front: 'idCardFront',
        back: 'idCardBack',
        hand: 'idCardHand',
        health: 'healthCertificate'
      };
      form[fieldMap[type]] = res.data.url;
      uploaded[type] = true;
      alert('图片上传成功！');
      console.log(`Upload success [${type}]:`, res.data.url);
    }
  } catch (err) {
    console.error('Upload error:', err);
    alert('图片上传失败: ' + (err.response?.data?.message || err.message));
  } finally {
    uploadLoading[type] = false;
    e.target.value = ''; // 清空 input 方便下次触发
  }
};

// 图片压缩工具函数
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 限制最大宽高
        const maxSide = 1200;
        if (width > height && width > maxSide) {
          height = (height * maxSide) / width;
          width = maxSide;
        } else if (height > maxSide) {
          width = (width * maxSide) / height;
          height = maxSide;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // 导出为 Blob，质量设为 0.7
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.7);
      };
    };
  });
};

const toggleSkill = (skill) => {
  const index = form.skills.indexOf(skill);
  if (index > -1) {
    form.skills.splice(index, 1);
  } else {
    form.skills.push(skill);
  }
};

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `http://localhost:3000${url}`;
};

const removeImage = (type) => {
  const fieldMap = {
    front: 'idCardFront',
    back: 'idCardBack',
    hand: 'idCardHand',
    health: 'healthCertificate'
  };
  form[fieldMap[type]] = '';
  uploaded[type] = false;
};

const handleSubmit = async () => {
  if (!form.realName || !form.idCardNo) {
    alert('请填写姓名和身份证号');
    return;
  }
  if (!uploaded.front || !uploaded.back || !uploaded.hand) {
    alert('请上传必要证件（身份证正反面及手持照）');
    return;
  }
  if (uploadLoading.front || uploadLoading.back || uploadLoading.hand || uploadLoading.health) {
    alert('图片正在上传中，请稍候');
    return;
  }
  
  submitting.value = true;
  try {
    const res = await api.post('/auth/worker/verify', form);
    if (res.data.success) {
      alert('✅ ' + res.data.message);
      // 延迟跳转，让用户看清提示
      setTimeout(() => {
        router.push('/');
      }, 500);
    } else {
      alert('❌ ' + (res.data.message || '提交失败'));
    }
  } catch (error) {
    alert('❌ 提交失败，请检查网络连接');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.page-container { background: var(--bg-color); height: 100%; display: flex; flex-direction: column; }
.nav-header { padding: 50px 20px 10px; display: flex; justify-content: space-between; align-items: center; background: white; border-bottom: 1px solid #eee; }
.nav-header i { font-size: 24px; cursor: pointer; }
.nav-header span { font-weight: 700; font-size: 18px; }

.form-content { flex: 1; overflow-y: auto; padding: 20px; }
.alert-box { background: #EEF2FF; color: var(--primary-color); padding: 12px; border-radius: 12px; font-size: 12px; display: flex; align-items: flex-start; margin-bottom: 20px; }
.alert-box i { margin-right: 8px; font-size: 16px; margin-top: 2px; }

.form-section { margin-bottom: 25px; }
.form-section label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; }

.input-group { background: white; padding: 12px 16px; border-radius: 12px; box-shadow: var(--shadow); }
.input-group input { border: none; outline: none; width: 100%; font-size: 14px; }

textarea { width: 100%; height: 100px; border: none; padding: 15px; border-radius: 12px; background: white; box-shadow: var(--shadow); outline: none; font-size: 14px; resize: none; }

.upload-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.upload-item { background: white; height: 80px; border-radius: 12px; border: 1px dashed #ccc; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; transition: 0.3s; }
.upload-item i { font-size: 20px; color: #999; }
.upload-item span { font-size: 10px; color: #999; margin-top: 4px; text-align: center; }

.upload-item.done { border-color: var(--success-color); background: #f0fff4; }
.upload-item.done i { color: var(--success-color); }
.upload-item.done span { color: var(--success-color); }

.upload-item.loading { background: #f7f7f7; cursor: wait; }
.upload-item.loading i { color: var(--primary-color); }

.preview-box { width: 100%; height: 100%; position: relative; }
.preview { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
.remove-btn { position: absolute; top: -8px; right: -8px; color: #FF3B30; background: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
.remove-btn i { font-size: 18px; }

.skill-tags { display: flex; flex-wrap: wrap; gap: 10px; }
.tag { background: white; padding: 6px 15px; border-radius: 20px; font-size: 12px; border: 1px solid #eee; transition: 0.3s; cursor: pointer; }
.tag.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }

.submit-btn { width: 100%; background: var(--primary-color); color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 700; font-size: 16px; margin-top: 20px; box-shadow: 0 8px 20px rgba(45, 90, 254, 0.3); display: flex; justify-content: center; align-items: center; gap: 8px; }
.submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
