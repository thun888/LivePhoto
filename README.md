# LivePhoto

一个用于在 Web 端解析和展示实况图片（Live Photos）的 JavaScript 库。支持 Android 动态照片和 Apple Live Photos。

[English](/README.en.md) | [中文](/README.md)

![](/images/preview.gif)

## 特性

- **多格式支持**：
  - 支持 Android 动态照片 (Motion Photos)
  - 支持 Apple Live Photos (.livp)
  - 普通视频+图片组合

## 安装

使用 npm 安装：

```bash
npm install @thun888/live-photo
```

## 快速开始

### 1. 引入资源

你可以通过 npm 引入，或者直接使用构建后的文件。

**ES Module:**

```javascript
import { init } from '@thun888/live-photo';
import '@thun888/live-photo/dist/main.css'; // 引入样式

// 初始化
init('.livephoto-item');
```

**Browser (Script Tag):**

```html
<link rel="stylesheet" href="path/to/dist/main.css">
<script src="path/to/dist/bundle.js"></script>

<script>
  document.addEventListener('DOMContentLoaded', () => {
    LivePhoto.init('.livephoto-item');
  });
</script>
```

### 2. HTML 结构

创建带有特定类名（如 `livephoto-item`）的容器，并通过 `data-*` 属性配置图片和选项。

```html
<!-- 方式一：自动解析 (推荐) -->
<!-- 只需提供图片地址，库会自动尝试从图片中解析视频 -->
<div
  class="livephoto-item"
  data-image="./path/to/motion-photo.jpg"
  data-alt="Android 动态照片"
></div>

<div
  class="livephoto-item"
  data-image="./path/to/apple-live-photo.livp"
  data-alt="Apple Live Photo"
></div>

<!-- 方式二：手动指定视频 -->
<!-- 如果你有独立的视频文件 -->
<div
  class="livephoto-item"
  data-image="./image.jpg"
  data-video="./video.mp4"
  data-width="400"
  data-height="300"
></div>
```

## 配置项 (Data Attributes)

所有配置均通过 HTML 元素的 `data-*` 属性进行设置：

| 属性 | 必填 | 描述 | 示例 |
|------|------|------|------|
| `data-image` | **是** | 图片文件的 URL。如果是实况图，将从中解析视频。 | `data-image="photo.jpg"` |
| `data-video` | 否 | 视频文件的 URL。如果提供，将跳过解析直接使用。 | `data-video="video.mp4"` |
| `data-width` | 否 | 容器宽度。如果不设置，将尝试自动获取图片尺寸。 | `data-width="300"` |
| `data-height` | 否 | 容器高度。 | `data-height="400"` |
| `data-type` | 否 | 强制指定解析类型 (`android` 或 `apple`)。默认自动检测。 | `data-type="apple"` |
| `data-muted` | 否 | 是否静音播放。如果不填，默认静音。 | `data-muted="true"` |
| `data-alt` | 否 | 图片的 alt 描述文本。 | `data-alt="示例图片"` |

## 开发

1. **安装依赖**
   ```bash
   npm install
   ```

2. **构建**
   ```bash
   npm run build
   ```

## 鸣谢

1. [测试不基于 LivePhotoKit JS 实现实况照片 - 陪她去流浪](https://blog.twofei.com/1603/)
2. [解析Android的动态照片 - 星外之神的博客 | wszqkzqk Blog](https://wszqkzqk.github.io/2024/08/01/解析Android的动态照片/)
3. [wszqkzqk/live-photo-conv: Live Photo Converter is a cross-platform tool to process live photos (or motion photos)](https://github.com/wszqkzqk/live-photo-conv)

## 许可证

MIT