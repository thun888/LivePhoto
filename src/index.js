import './style.css';
import iconImg from '../assets/icon.png';
import muteIconImg from '../assets/mute-icon.svg';
import unmuteIconImg from '../assets/unmute-icon.svg';
import { parseAndroidLivePhoto, parseAppleLivePhoto } from './parsers';

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
      width: userWidth || 0,
      height: userHeight || 0,
      alt: options.alt || '',
      iconText: options.iconText || '实况',
      mute: options.mute !== undefined ? options.mute : true
    };

    if (this.options.width.endsWith('px')) {
      this.options.width = parseInt(this.options.width.slice(0, -2));
    }
    if (this.options.height.endsWith('px')) {
      this.options.height = parseInt(this.options.height.slice(0, -2));
    }
    if (!this.options.imageSrc) {
      console.warn('[LivePhoto] 缺少 imageSrc，无法初始化该实例');
      return;
    }
    this.isMuted = this.options.mute;
    
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

  init() {
    this.render();
    this.bindEvents();
    if (!this.options.videoSrc && this.options.imageSrc) {
      const type = this.options.type.toLowerCase();
      
      const handleResult = (files) => {
        if (files.video) {
          const videoUrl = URL.createObjectURL(files.video);
          this.elements.video.src = videoUrl;
          this.options.videoSrc = videoUrl;
          if (type !== 'android') this.elements.video.loop = true;
        }
        if (files.image) {
          const imageUrl = URL.createObjectURL(files.image);
          this.elements.image.src = imageUrl;
        }
      };

      if (type === 'apple' || this.options.imageSrc.toLowerCase().endsWith('.livp')) {
        parseAppleLivePhoto(this.options.imageSrc)
          .then(handleResult)
          .catch(e => console.warn('[LivePhoto] Apple LivePhoto parse failed:', e));
      } else if (type === 'android') {
        parseAndroidLivePhoto(this.options.imageSrc)
          .then(handleResult)
          .catch(e => console.warn('[LivePhoto] Android LivePhoto parse failed:', e));
      } else {
        console.warn('[LivePhoto] 无法识别的 LivePhoto 类型，默认尝试 Android 解析');
        parseAndroidLivePhoto(this.options.imageSrc)
          .then(handleResult)
          .catch(e => console.warn('[LivePhoto] Auto parse failed:', e));
      }
    }
  }

  render() {
    const { width, height, videoSrc, imageSrc, alt, iconText } = this.options;
    const aspectRatio = (width / height).toFixed(4);

    this.container.innerHTML = `
      <div class="live-photo" style="width: ${width}px; aspect-ratio: ${aspectRatio}">
        <div class="container">
          <video src="${videoSrc}" ${this.isMuted ? 'muted' : ''} playsinline preload="metadata"></video>
          <img src="${imageSrc}" alt="${alt}" loading="lazy" />
        </div>
        <div class="controls">
          <div class="icon">
            <img src="${iconImg}" alt="live-icon" />
            <span>${iconText}</span>
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