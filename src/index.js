import './style.css';
import iconImg from '../assets/icon.png';
import muteIconImg from '../assets/mute-icon.svg';
import unmuteIconImg from '../assets/unmute-icon.svg';
import { fetchWithProgress, extractAndroidVideo, parseAppleLivePhoto } from './parsers';

class LivePhoto {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    const userWidth = options.width || this.container.dataset.width;
    const userHeight = options.height || this.container.dataset.height;
    this.autoSize = !userWidth || !userHeight;

    this.options = {
      videoSrc: options.videoSrc || this.container.dataset.video || '',
      imageSrc: options.imageSrc || this.container.dataset.image,
      type: options.type || this.container.dataset.type || 'android',
      width: userWidth || 400,
      height: userHeight || 300,
      alt: options.alt || '',
      iconText: options.iconText || '实况',
      mute: options.mute !== undefined ? options.mute : true
    };

    if (typeof this.options.width === 'string' && this.options.width.endsWith('px')) {
      this.options.width = parseInt(this.options.width.slice(0, -2));
    }
    if (typeof this.options.height === 'string' && this.options.height.endsWith('px')) {
      this.options.height = parseInt(this.options.height.slice(0, -2));
    }
    if (!this.options.imageSrc) {
      console.warn('[LivePhoto] 缺少 imageSrc，无法初始化该实例');
      return;
    }
    this.isMuted = this.options.mute;

    // 加载状态：图片显示 + 所有后台任务完成后才算加载完成
    this.isFinished = false;
    this.imageSettled = false;
    this.pendingLoads = 0;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.init();
          this.observer.disconnect();
        }
      });
    });
    this.observer.observe(this.container);
  }

  // 更新左上角加载进度（ratio 为 0~1，null 表示无法得知进度）
  setProgress(ratio) {
    if (this.isFinished || !this.elements || !this.elements.iconText) return;
    if (ratio === null || ratio === undefined || !(ratio >= 0)) {
      this.elements.iconText.textContent = '…';
    } else {
      this.elements.iconText.textContent = `${Math.round(Math.min(ratio, 1) * 100)} %`;
    }
  }

  markImageSettled() {
    this.imageSettled = true;
    this.settle();
  }

  settle() {
    if (this.isFinished || !this.imageSettled || this.pendingLoads > 0) return;
    this.isFinished = true;
    this.elements.wrapper.classList.remove('loading');
    this.elements.iconText.textContent = this.options.iconText;
  }

  // 登记一个后台加载任务，结束后统一判断是否加载完成
  trackLoad(task) {
    this.pendingLoads++;
    return Promise.resolve(task).then(
      (value) => { this.pendingLoads--; this.settle(); return value; },
      (err) => { this.pendingLoads--; this.settle(); throw err; }
    );
  }

  // HEIC 解码为 JPEG Blob
  async decodeHeic(buffer) {
    const { default: decodeHeic } = await import('heic-decode');
    const { width, height, data } = await decodeHeic({ buffer: new Uint8Array(buffer) });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    if (this.autoSize) {
      this.options.width = width;
      this.options.height = height;
      this.autoSize = false;
    }
    canvas.getContext('2d').putImageData(new ImageData(data, width, height), 0, 0);
    const jpegBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg'));
    if (!jpegBlob) throw new Error('HEIC to JPEG conversion failed');
    return jpegBlob;
  }

  init() {
    this.render();
    this.bindEvents();

    const src = this.options.imageSrc;
    const type = (this.options.type || 'android').toLowerCase();
    const isApple = type === 'apple' || /\.livp$/i.test(src);

    if (isApple) {
      this.loadAppleLivePhoto(src);
      return;
    }

    if (type !== 'android') {
      console.warn('[LivePhoto] 无法识别的 LivePhoto 类型，默认尝试 Android 解析');
    }
    this.loadAndroidLivePhoto(src);
  }

  async loadAndroidLivePhoto(src) {
    this.trackLoad(
      (async () => {
        const isHeic = /\.heic$/i.test(src);
        const buffer = await fetchWithProgress(src, (ratio) => this.setProgress(ratio));

        if (isHeic) {
          const jpegBlob = await this.decodeHeic(buffer);
          this.elements.image.src = URL.createObjectURL(jpegBlob);
          return;
        }

        this.elements.image.src = URL.createObjectURL(new Blob([buffer]));
        if (!this.options.videoSrc) {
          const video = extractAndroidVideo(buffer);
          if (video) {
            const videoUrl = URL.createObjectURL(video);
            this.elements.video.src = videoUrl;
            this.options.videoSrc = videoUrl;
          }
        }
      })()
        .catch((e) => {
          console.warn('[LivePhoto] 加载图片/视频失败:', e);
          this.markImageSettled();
        })
    );
  }

  loadAppleLivePhoto(src) {
    this.trackLoad(
      parseAppleLivePhoto(src, (ratio) => this.setProgress(ratio))
        .then(async (files) => {
          if (files.video && !this.options.videoSrc) {
            const videoUrl = URL.createObjectURL(files.video);
            this.elements.video.src = videoUrl;
            this.options.videoSrc = videoUrl;
            this.elements.video.loop = true;
          }
          if (files.image) {
            let imageBlob = files.image;
            if (imageBlob.type === 'image/heic') {
              try {
                imageBlob = await this.decodeHeic(await imageBlob.arrayBuffer());
              } catch (e) {
                console.warn('[LivePhoto] HEIC 转换失败:', e);
              }
            }
            this.elements.image.src = URL.createObjectURL(imageBlob);
          }
        })
        .catch((e) => {
          console.warn('[LivePhoto] Apple LivePhoto 解析失败:', e);
          // 回退：可能只是普通图片（如单独的 HEIC），按 Android/普通图片流程再试一次
          this.loadAndroidLivePhoto(src);
        })
    );
  }

  render() {
    const { width, height, videoSrc, alt, iconText } = this.options;
    const aspectRatio = (width / height).toFixed(4);

    this.container.innerHTML = `
      <div class="live-photo loading" style="width: ${width}px; aspect-ratio: ${aspectRatio}">
        <div class="container">
          <video ${videoSrc ? `src="${videoSrc}"` : ''} ${this.isMuted ? 'muted' : ''} playsinline preload="metadata"></video>
          <img alt="${alt}" />
        </div>
        <div class="controls">
          <div class="icon">
            <img src="${iconImg}" alt="live-icon" />
            <span>0 %</span>
          </div>
          <div class="volume-control">
            <img src="${this.isMuted ? muteIconImg : unmuteIconImg}" class="volume-icon" />
          </div>
        </div>
        <div class="warning"></div>
      </div>
    `;

    this.elements = {
      wrapper: this.container.querySelector('.live-photo'),
      video: this.container.querySelector('video'),
      image: this.container.querySelector('img'),
      icon: this.container.querySelector('.icon'),
      iconText: this.container.querySelector('.icon span'),
      volumeControl: this.container.querySelector('.volume-control'),
      volumeIcon: this.container.querySelector('.volume-icon'),
      warning: this.container.querySelector('.warning')
    };

    if (this.autoSize) {
      const updateSize = () => {
        const { naturalWidth, naturalHeight } = this.elements.image;
        if (naturalWidth && naturalHeight) {
          const aspectRatio = (naturalWidth / naturalHeight).toFixed(4);
          this.elements.wrapper.style.width = `${naturalWidth}px`;
          this.elements.wrapper.style.aspectRatio = aspectRatio;
        }
      };

      if (this.elements.image.complete) {
        updateSize();
      } else {
        this.elements.image.onload = updateSize;
      }
    }
  }

  bindEvents() {
    // 图片加载完成或失败，都结束 loading 状态
    this.elements.image.addEventListener('load', () => this.markImageSettled());
    this.elements.image.addEventListener('error', () => this.markImageSettled());

    const start = (e) => this.handleStart(e);
    const stop = () => this.handleStop();

    // 交互逻辑：点击/悬停图标触发
    this.elements.icon.addEventListener('mouseenter', start);
    this.elements.wrapper.addEventListener('mouseleave', stop);
    
    // 移动端支持
    this.elements.icon.addEventListener('touchstart', start, { passive: false });
    this.elements.wrapper.addEventListener('touchend', stop);

    this.elements.video.addEventListener('ended', () => {
      this.elements.wrapper.classList.remove('zoom');
    });

    this.elements.volumeControl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isMuted = !this.isMuted;
      this.elements.video.muted = this.isMuted;
      this.elements.volumeIcon.src = this.isMuted ? muteIconImg : unmuteIconImg;
    });
  }

  async handleStart(e) {
    if (e.cancelable) e.preventDefault();
    try {
      this.elements.video.currentTime = 0;
      this.elements.video.muted = this.isMuted;
      await this.elements.video.play();
      this.elements.wrapper.classList.add('zoom');
      this.elements.warning.classList.remove('show');
    } catch (err) {
      this.showWarning('播放失败: 尝试点击一下以允许播放');
    }
  }

  handleStop() {
    this.elements.wrapper.classList.remove('zoom');
    this.elements.video.pause();
  }

  showWarning(msg) {
    this.elements.warning.textContent = msg;
    this.elements.warning.classList.add('show');
  }
}

/**
 * 初始化函数
 * @param {string} class_name 选择器名称，例如 '.live-photo-item'
 */
export function init(class_name) {
  console.log('[LivePhoto] 初始化类名:', class_name);
  const elements = document.querySelectorAll(class_name);
  elements.forEach(el => new LivePhoto(el));
  console.log(`[LivePhoto] 已初始化 ${elements.length} 个实例`);
}