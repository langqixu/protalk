/**
 * 飞书卡片v2组件构建器
 * 基于最新的飞书卡片JSON v2规范
 * @see https://open.feishu.cn/document/feishu-cards/card-json-v2-structure
 * @see https://open.feishu.cn/document/feishu-cards/card-json-v2-components/component-json-v2-overview
 */

import logger from './logger';

// ================================
// 基础类型定义
// ================================

export interface CardConfig {
  wide_screen_mode?: boolean;
  enable_forward?: boolean;
  update_multi?: boolean;
  style?: {
    theme?: 'default' | 'dark';
    header_style?: 'default' | 'compact';
  };
}

export interface CardHeader {
  title: {
    tag: 'plain_text' | 'lark_md';
    content: string;
    lines?: number;
  };
  subtitle?: {
    tag: 'plain_text' | 'lark_md';
    content: string;
  };
  template?: 'blue' | 'wathet' | 'turquoise' | 'green' | 'yellow' | 'orange' | 'red' | 'carmine' | 'violet' | 'purple' | 'indigo' | 'grey' | 'default';
  ud_icon?: {
    token: string;
    style?: {
      width?: string;
      height?: string;
    };
  };
}

export interface TextElement {
  tag: 'plain_text' | 'lark_md';
  content: string;
  text_align?: 'left' | 'center' | 'right';
  text_size?: 'heading' | 'normal' | 'notation' | 'xxxx_large' | 'xxx_large' | 'xx_large' | 'x_large' | 'large' | 'medium' | 'small' | 'x_small';
  lines?: number;
}

export interface DivElement {
  tag: 'div';
  text?: TextElement;
  fields?: Array<{
    is_short?: boolean;
    text: TextElement;
  }>;
  extra?: any;
}

export interface ButtonElement {
  tag: 'button';
  text: TextElement;
  type?: 'default' | 'primary' | 'danger';
  size?: 'tiny' | 'small' | 'medium' | 'large';
  width?: 'default' | 'fill' | 'auto';
  action_type?: 'request' | 'link' | 'multi';
  url?: string;
  multi_url?: {
    url: string;
    android_url?: string;
    ios_url?: string;
    pc_url?: string;
  };
  value?: any;
  confirm?: {
    title: TextElement;
    text: TextElement;
  };
}

export interface InputElement {
  tag: 'input';
  name: string;
  required?: boolean;
  placeholder?: TextElement;
  default_value?: string;
  width?: 'default' | 'fill' | 'auto';
  max_length?: number;
}

export interface ImageElement {
  tag: 'img';
  img_key: string;
  alt?: TextElement;
  title?: TextElement;
  corner_radius?: string;
  scale_type?: 'crop_center' | 'crop_top' | 'fit_horizontal' | 'stretch';
  size?: 'large' | 'medium' | 'small' | 'tiny';
  transparent?: boolean;
  preview?: boolean;
}

export interface ColumnSetElement {
  tag: 'column_set';
  flex_mode: 'none' | 'stretch' | 'flow';
  background_style?: 'default' | 'grey';
  columns: Array<{
    tag: 'column';
    width?: 'auto' | 'weighted' | string;
    weight?: number;
    vertical_align?: 'top' | 'center' | 'bottom';
    elements: CardElement[];
  }>;
}

export interface NoteElement {
  tag: 'note';
  elements: Array<TextElement | ImageElement>;
}

export interface HrElement {
  tag: 'hr';
}

export interface ActionElement {
  tag: 'action';
  actions: ButtonElement[];
  layout?: 'bisected' | 'trisection' | 'flow';
}

export type CardElement = 
  | DivElement 
  | ButtonElement 
  | ImageElement 
  | ColumnSetElement 
  | NoteElement 
  | HrElement 
  | ActionElement
  | InputElement;

export interface FeishuCardV2 {
  config?: CardConfig;
  header?: CardHeader;
  elements: CardElement[];
  i18n_elements?: {
    [key: string]: CardElement[];
  };
}

// ================================
// 卡片构建器类
// ================================

export class FeishuCardV2Builder {
  private card: FeishuCardV2;

  constructor() {
    this.card = {
      elements: []
    };
  }

  /**
   * 设置卡片配置
   */
  setConfig(config: CardConfig): this {
    this.card.config = config;
    return this;
  }

  /**
   * 设置卡片头部
   */
  setHeader(header: CardHeader): this {
    this.card.header = header;
    return this;
  }

  /**
   * 添加文本分割元素
   */
  addDiv(text?: string | TextElement, fields?: Array<{ isShort?: boolean; text: string | TextElement }>): this {
    const element: DivElement = {
      tag: 'div'
    };

    if (text) {
      element.text = typeof text === 'string' 
        ? { tag: 'lark_md', content: text }
        : text;
    }

    if (fields) {
      element.fields = fields.map(field => ({
        is_short: field.isShort || false,
        text: typeof field.text === 'string'
          ? { tag: 'lark_md', content: field.text }
          : field.text
      }));
    }

    this.card.elements.push(element);
    return this;
  }

  /**
   * 添加按钮元素
   */
  addButton(
    text: string | TextElement,
    options: {
      type?: ButtonElement['type'];
      size?: ButtonElement['size'];
      actionType?: ButtonElement['action_type'];
      url?: string;
      value?: any;
      confirm?: { title: string; text: string };
    } = {}
  ): this {
    const button: ButtonElement = {
      tag: 'button',
      text: typeof text === 'string' 
        ? { tag: 'plain_text', content: text }
        : text,
      type: options.type || 'default',
      size: options.size || 'medium'
    };

    // 根据配置设置 action_type
    if (options.url) {
      button.url = options.url;
      button.action_type = 'link';
    } else if (options.actionType) {
      button.action_type = options.actionType;
    }
    // 如果没有明确指定 actionType 且没有 url，则不设置 action_type
    // 这样飞书会使用默认的 callback 行为

    if (options.value !== undefined) {
      button.value = options.value;
    }

    if (options.confirm) {
      button.confirm = {
        title: { tag: 'plain_text', content: options.confirm.title },
        text: { tag: 'plain_text', content: options.confirm.text }
      };
    }

    this.card.elements.push(button);
    return this;
  }

  /**
   * 添加操作按钮组
   */
  addActionGroup(
    buttons: Array<{
      text: string;
      type?: ButtonElement['type'];
      actionType?: ButtonElement['action_type'];
      url?: string;
      value?: any;
    }>,
    layout: ActionElement['layout'] = 'flow'
  ): this {
    const actionButtons: ButtonElement[] = buttons.map(btn => {
      const button: ButtonElement = {
        tag: 'button',
        text: { tag: 'plain_text', content: btn.text },
        type: btn.type || 'default'
      };

      // 根据配置设置 action_type
      if (btn.url) {
        button.url = btn.url;
        button.action_type = 'link';
      } else if (btn.actionType) {
        button.action_type = btn.actionType;
      }
      // 如果没有明确指定 actionType 且没有 url，则不设置 action_type
      // 这样飞书会使用默认的 callback 行为

      if (btn.value !== undefined) {
        button.value = btn.value;
      }

      return button;
    });

    this.card.elements.push({
      tag: 'action',
      actions: actionButtons,
      layout
    });
    return this;
  }

  /**
   * 添加输入框元素
   */
  addInput(
    name: string,
    options: {
      placeholder?: string;
      defaultValue?: string;
      required?: boolean;
      maxLength?: number;
      width?: InputElement['width'];
    } = {}
  ): this {
    const input: InputElement = {
      tag: 'input',
      name,
      required: options.required || false,
      width: options.width || 'fill',
      ...(options.placeholder && { 
        placeholder: { tag: 'plain_text', content: options.placeholder }
      }),
      ...(options.defaultValue && { default_value: options.defaultValue }),
      ...(options.maxLength && { max_length: options.maxLength })
    };

    this.card.elements.push(input);
    return this;
  }

  /**
   * 添加图片元素
   */
  addImage(
    imgKey: string,
    options: {
      alt?: string;
      title?: string;
      size?: ImageElement['size'];
      scaleType?: ImageElement['scale_type'];
      preview?: boolean;
    } = {}
  ): this {
    const image: ImageElement = {
      tag: 'img',
      img_key: imgKey,
      size: options.size || 'medium',
      scale_type: options.scaleType || 'crop_center',
      preview: options.preview !== false
    };

    if (options.alt) {
      image.alt = { tag: 'plain_text', content: options.alt };
    }

    if (options.title) {
      image.title = { tag: 'plain_text', content: options.title };
    }

    this.card.elements.push(image);
    return this;
  }

  /**
   * 添加分栏布局
   */
  addColumnSet(
    columns: Array<{
      width?: 'auto' | 'weighted' | string;
      weight?: number;
      elements: Array<{ type: 'div' | 'button' | 'image'; content: any }>;
    }>,
    flexMode: ColumnSetElement['flex_mode'] = 'none'
  ): this {
    const columnSet: ColumnSetElement = {
      tag: 'column_set',
      flex_mode: flexMode,
      columns: columns.map(col => ({
        tag: 'column',
        width: col.width || 'auto',
        ...(col.weight !== undefined && { weight: col.weight }),
        elements: col.elements.map(el => {
          switch (el.type) {
            case 'div':
              return {
                tag: 'div',
                text: typeof el.content === 'string' 
                  ? { tag: 'lark_md', content: el.content }
                  : el.content
              } as DivElement;
            case 'button':
              return {
                tag: 'button',
                text: { tag: 'plain_text', content: el.content.text },
                type: el.content.type || 'default',
                action_type: el.content.actionType || 'request',
                ...(el.content.url && { url: el.content.url, action_type: 'link' as const }),
                ...(el.content.value && { value: el.content.value })
              } as ButtonElement;
            case 'image':
              return {
                tag: 'img',
                img_key: el.content.imgKey,
                size: el.content.size || 'medium'
              } as ImageElement;
            default:
              throw new Error(`Unsupported column element type: ${el.type}`);
          }
        })
      }))
    };

    this.card.elements.push(columnSet);
    return this;
  }

  /**
   * 添加备注元素
   */
  addNote(elements: Array<{ type: 'text' | 'image'; content: string }>): this {
    const noteElements: Array<TextElement | ImageElement> = elements.map(el => {
      if (el.type === 'text') {
        return { tag: 'plain_text', content: el.content };
      } else {
        return { tag: 'img', img_key: el.content };
      }
    });

    this.card.elements.push({
      tag: 'note',
      elements: noteElements
    });
    return this;
  }

  /**
   * 添加分割线
   */
  addHr(): this {
    this.card.elements.push({ tag: 'hr' });
    return this;
  }

  /**
   * 构建最终的卡片对象
   */
  build(): FeishuCardV2 {
    if (this.card.elements.length === 0) {
      logger.warn('卡片没有任何元素');
    }

    return JSON.parse(JSON.stringify(this.card));
  }

  /**
   * 重置构建器
   */
  reset(): this {
    this.card = {
      elements: []
    };
    return this;
  }

  /**
   * 克隆当前构建器
   */
  clone(): FeishuCardV2Builder {
    const newBuilder = new FeishuCardV2Builder();
    newBuilder.card = JSON.parse(JSON.stringify(this.card));
    return newBuilder;
  }
}

// ================================
// 便捷工厂函数
// ================================

/**
 * 创建新的卡片构建器
 */
export function createCardBuilder(): FeishuCardV2Builder {
  return new FeishuCardV2Builder();
}

/**
 * 创建基础文本卡片
 */
export function createTextCard(
  title: string,
  content: string,
  template: CardHeader['template'] = 'default'
): FeishuCardV2 {
  return createCardBuilder()
    .setConfig({ wide_screen_mode: true, enable_forward: true })
    .setHeader({
      title: { tag: 'plain_text', content: title },
      template
    })
    .addDiv(content)
    .build();
}

/**
 * 创建信息展示卡片
 */
export function createInfoCard(
  title: string,
  fields: Array<{ label: string; value: string }>,
  template: CardHeader['template'] = 'blue'
): FeishuCardV2 {
  const builder = createCardBuilder()
    .setConfig({ wide_screen_mode: true, enable_forward: true })
    .setHeader({
      title: { tag: 'plain_text', content: title },
      template
    });

  fields.forEach(field => {
    builder.addDiv(undefined, [
      { isShort: true, text: `**${field.label}**` },
      { isShort: true, text: field.value }
    ]);
  });

  return builder.build();
}

/**
 * 创建评论卡片（v2版本）
 * 这是缺失的函数，用于构建带交互按钮的评论卡片
 */
export function buildReviewCardV2(reviewData: {
  id: string;
  rating: number;
  title?: string;
  content: string;
  author: string;
  date: string;
  app_name: string;
  store_type?: string;
  helpful_count?: number;
  developer_response?: any;
}): FeishuCardV2 {
  const stars = '⭐'.repeat(Math.max(0, Math.min(5, reviewData.rating || 0)));
  const emptyStars = '☆'.repeat(5 - Math.max(0, Math.min(5, reviewData.rating || 0)));
  const storeIcon = reviewData.store_type === 'ios' ? '📱' : '🤖';
  
  // 🎨 智能颜色主题和情感表达
  let template: CardHeader['template'] = 'blue';
  let ratingEmoji = '😐';
  
  if (reviewData.rating >= 4) {
    template = 'green';
    ratingEmoji = '😊';
  } else if (reviewData.rating >= 3) {
    template = 'yellow';
    ratingEmoji = '🙂';
  } else {
    template = 'red';
    ratingEmoji = '😟';
  }

  const builder = createCardBuilder()
    .setConfig({ 
      wide_screen_mode: true, 
      enable_forward: true 
    })
    .setHeader({
      title: { 
        tag: 'plain_text', 
        content: `${storeIcon} ${reviewData.app_name} - 新评论通知` 
      },
      template
    });

  // 🌟 优雅的评分展示
  builder.addDiv(`${ratingEmoji} **评分**: ${stars}${emptyStars} (${reviewData.rating}/5)`);

  // 📋 基础信息区域 - 简化为两行显示
  builder.addDiv(`**👤 用户**: ${reviewData.author || '匿名用户'}`);
  builder.addDiv(`**📅 时间**: ${new Date(reviewData.date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`);

  // 📝 评论标题（如果有）
  if (reviewData.title) {
    builder.addDiv(`**📝 标题**: ${reviewData.title}`);
  }

  // 💬 评论内容区域 - 使用note突出显示
  builder.addNote([
    {
      type: 'text',
      content: `💭 **评论内容**:\n${reviewData.content || '暂无文字评论，仅评分'}`
    }
  ]);

  // 🔄 开发者回复区域
  if (reviewData.developer_response && reviewData.developer_response.body) {
    builder.addNote([
      {
        type: 'text',
        content: `🔄 **开发者回复**: ${reviewData.developer_response.body}`
      }
    ]);
  }

  // 分隔线
  builder.addHr();

  // 🎯 交互输入区域
  builder.addDiv('💬 **快速回复评论**');

  builder.addInput('reply_content', {
    placeholder: '感谢您的反馈！我们会认真考虑您的建议...',
    required: true,
    maxLength: 1000
  });

  // 🎨 增强的交互按钮组
  builder.addActionGroup([
    {
      text: '📤 提交回复',
      type: 'primary',
      value: {
        action: 'submit_reply',
        review_id: reviewData.id,
        app_name: reviewData.app_name,
        author: reviewData.author
      }
    },
    {
      text: '📊 查看详情',
      type: 'default',
      value: {
        action: 'view_details',
        review_id: reviewData.id
      }
    },
    {
      text: '🏷️ 添加标签',
      type: 'default',
      value: {
        action: 'add_tags',
        review_id: reviewData.id
      }
    }
  ]);

  // 📈 附加信息
  if (reviewData.helpful_count !== undefined && reviewData.helpful_count > 0) {
    builder.addDiv(`👍 ${reviewData.helpful_count} 人认为此评论有帮助`);
  }

  return builder.build();
}

/**
 * 创建确认对话卡片
 */
export function createConfirmCard(
  title: string,
  message: string,
  confirmText: string = '确认',
  cancelText: string = '取消',
  confirmValue: any = { action: 'confirm' },
  cancelValue: any = { action: 'cancel' }
): FeishuCardV2 {
  return createCardBuilder()
    .setConfig({ wide_screen_mode: true })
    .setHeader({
      title: { tag: 'plain_text', content: title },
      template: 'yellow'
    })
    .addDiv(message)
    .addHr()
    .addActionGroup([
      { text: confirmText, type: 'primary', value: confirmValue },
      { text: cancelText, type: 'default', value: cancelValue }
    ])
    .build();
}

// buildReviewCardV2 已经作为 export function 导出

export default {
  FeishuCardV2Builder,
  createCardBuilder,
  createTextCard,
  createInfoCard,
  createConfirmCard,
  buildReviewCardV2
};
