import { useSyncExternalStore } from 'react';
import { addMessages } from './i18n.jsx';

const registry = new Map();
const subs = new Set();
let snapshot = [];

// Event bus: các plugin nói chuyện với nhau mà không import nhau
const topics = new Map();
export const bus = {
  on(topic, fn) {
    if (!topics.has(topic)) topics.set(topic, new Set());
    topics.get(topic).add(fn);
    return () => topics.get(topic).delete(fn);
  },
  emit(topic, data) { topics.get(topic)?.forEach((fn) => fn(data)); },
};

/**
 * Hợp đồng của một plugin:
 * { id, title, icon, order?, initialState?,
 *   search?(q)=>[{id,title,subtitle,state}], messages?, adminOnly?, Menu?,
 *   ribbon?({state,setState,bus,t,role,can}), refresh?, View({..,role,can}), Badge?, setup?({bus}) }
 */
export function registerPlugin(p) {
  if (!p?.id || !p.View) throw new Error('Plugin cần có id và View');
  registry.set(p.id, { order: 100, ...p });
  addMessages(p.messages ?? {});
  p.setup?.({ bus });
  snapshot = [...registry.values()].sort((a, b) => a.order - b.order);
  subs.forEach((f) => f());
}

export const usePlugins = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => snapshot);
