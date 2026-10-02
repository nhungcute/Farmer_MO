import { attributes, classNames, escapeHtml, formatNumber } from './html.js';
import { FarmIcon } from './icons.js';

const tone = value => ['green','orange','cream','red','blue'].includes(value) ? value : 'green';
export function FarmButton({ label='',icon='',variant='green',disabled=false,busy=false,className='',attrs={} } = {}) {
  return `<button${attributes({ ...attrs,type:attrs.type || 'button',class:classNames('farm-button',`farm-button--${tone(variant)}`,className),disabled:disabled || busy,'aria-busy':String(busy) })}>${icon ? FarmIcon(icon) : ''}<span>${escapeHtml(label)}</span>${busy ? '<span class="farm-spinner" aria-hidden="true"></span>' : ''}</button>`;
}
export function FarmIconButton({ label='',icon='',variant='cream',disabled=false,className='',attrs={} } = {}) {
  return FarmButton({ label,icon,variant,disabled,className:classNames('farm-icon-button',className),attrs:{...attrs,'aria-label':label,title:label} });
}
export function FarmCloseButton({ label='Đóng cửa sổ',attrs={} } = {}) {
  return FarmIconButton({label,icon:'close',variant:'red',className:'farm-close',attrs:{'data-action':'close',...attrs}});
}
export function WoodHeader({ title='',icon='',content='',close=false,id='' } = {}) {
  return `<header class="farm-wood-header">${icon ? FarmIcon(icon) : ''}<h2${attributes({id})}>${escapeHtml(title)}</h2>${content}${close ? FarmCloseButton() : ''}</header>`;
}
export function FarmPanel({ title='',icon='',body='',footer='',className='',attrs={},header='' } = {}) {
  return `<section${attributes({...attrs,class:classNames('farm-panel',className)})}>${header || (title ? WoodHeader({title,icon}) : '')}<div class="farm-panel__body">${body}</div>${footer ? `<footer class="farm-panel__footer">${footer}</footer>` : ''}</section>`;
}
export function FarmTabs({ tabs=[],selected='',action='category',label='Danh mục',id='farm-tabs' } = {}) {
  const activeId = tabs.find(tab => tab.id === selected && !tab.disabled)?.id ?? tabs.find(tab => !tab.disabled)?.id;
  return `<div class="farm-tabs" role="tablist" aria-label="${escapeHtml(label)}">${tabs.map(tab => {
    const active = tab.id === activeId;
    return `<button${attributes({type:'button',class:classNames('farm-tab',active && 'is-active'),role:'tab',id:`${id}-${tab.id}`,'aria-selected':String(active),tabindex:active ? 0 : -1,disabled:tab.disabled,[`data-${action}`]:tab.id,'data-focus-key':`${id}-${tab.id}`})}>${tab.icon ? FarmIcon(tab.icon) : ''}<span>${escapeHtml(tab.label)}</span>${tab.count !== undefined ? FarmBadge({label:formatNumber(tab.count)}) : ''}</button>`;
  }).join('')}</div>`;
}
export function FarmModal({ id='farm-modal',title='',icon='',body='',footer='',className='',open=false,attrs={} } = {}) {
  return `<dialog${attributes({...attrs,id,class:classNames('farm-modal',className),open,'aria-labelledby':`${id}-title`})}>${FarmPanel({header:WoodHeader({title,icon,id:`${id}-title`,close:true}),body,footer})}<div class="farm-modal__notice" role="status" aria-live="polite"></div></dialog>`;
}
export function FarmToast({ message='',variant='info',dismissible=true,id='',attrs={} } = {}) {
  const error = variant === 'error';
  return `<div${attributes({...attrs,id,class:classNames('farm-toast',error && 'farm-toast--error'),role:error ? 'alert' : 'status','aria-live':error ? 'assertive' : 'polite'})}>${FarmIcon(error ? 'error' : variant === 'success' ? 'success' : 'info')}<span>${escapeHtml(message)}</span>${dismissible ? FarmCloseButton({label:'Đóng thông báo',attrs:{'data-action':'dismiss-toast'}}) : ''}</div>`;
}
export function FarmProgress({ value=0,max=100,label='',id='',className='',attrs={} } = {}) {
  const maximum = Number.isFinite(Number(max)) && Number(max)>0 ? Number(max) : 1;
  const current = Math.min(maximum,Math.max(0,Number(value)||0));
  return `<div${attributes({...attrs,id,class:classNames('farm-progress',className),role:'progressbar','aria-label':label,'aria-valuemin':0,'aria-valuemax':maximum,'aria-valuenow':current})}><span class="farm-progress__fill" style="width:${current/maximum*100}%"></span><b>${escapeHtml(label || `${formatNumber(current)} / ${formatNumber(maximum)}`)}</b></div>`;
}
export function FarmResourceChip({ icon='coins',label='',value=0,id='',action='',attrs={} } = {}) {
  return `<div${attributes({...attrs,class:'farm-resource','aria-label':label})}>${FarmIcon(icon)}<b${attributes({id})}>${escapeHtml(typeof value==='number' ? formatNumber(value) : value)}</b>${action ? FarmIconButton({label:`Xem ${label}`,icon:'plus',variant:'green',attrs:{'data-panel':action}}) : ''}</div>`;
}
export function FarmItemSlot({ itemId='',title='',quantity=0,selected=false,disabled=false,badge='',action='item',className='',attrs={} } = {}) {
  return `<button${attributes({...attrs,type:'button',class:classNames('farm-item-slot',selected && 'is-selected',className),disabled,'aria-pressed':String(selected),[`data-${action}`]:itemId,'data-focus-key':`item-${itemId}`})}>${FarmIcon(itemId)}<strong>${escapeHtml(title)}</strong><span class="farm-item-slot__quantity">${formatNumber(quantity)}</span>${badge ? FarmBadge({label:badge}) : ''}</button>`;
}
export function FarmBadge({ label='',variant='cream',attrs={} } = {}) {
  return `<span${attributes({...attrs,class:`farm-badge farm-badge--${tone(variant)}`})}>${escapeHtml(label)}</span>`;
}
export const PRIMITIVES = Object.freeze({FarmPanel,WoodHeader,FarmButton,FarmIconButton,FarmTabs,FarmModal,FarmToast,FarmProgress,FarmResourceChip,FarmItemSlot,FarmBadge,FarmCloseButton});
