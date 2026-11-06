import { tick } from "svelte";
import type { Attachment } from "svelte/attachments";

export interface SortableOptions {
  onmove: (from: number, to: number) => void;
  disabled?: boolean;
}

const ITEM = "[data-sortable-item]";
const HANDLE = "[data-sortable-handle]";
const DRAGGING = "data-sortable-dragging";
const ANIMATION_ID = "plinth-sortable";
const SHIFT_MS = 180;
const SETTLE_MS = 160;
const EASING = "cubic-bezier(0.2, 0, 0, 1)";
const KEY_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

interface Drag {
  item: HTMLElement;
  pointerId: number;
  grabX: number;
  grabY: number;
  startLeft: number;
  startTop: number;
  x: number;
  y: number;
  restore: { position: string; zIndex: string; willChange: string };
}

const destination = (key: string, from: number, last: number) => {
  if (key === "Home") return 0;
  if (key === "End") return last;
  return key in KEY_STEPS ? from + KEY_STEPS[key] : null;
};

interface Point {
  x: number;
  y: number;
}

const layoutCenter = (element: HTMLElement): Point => ({
  x: element.offsetLeft + element.offsetWidth / 2,
  y: element.offsetTop + element.offsetHeight / 2,
});

const draggedCenter = (current: Drag): Point => ({
  x: current.startLeft + current.item.offsetWidth / 2 + current.x - current.grabX,
  y: current.startTop + current.item.offsetHeight / 2 + current.y - current.grabY,
});

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const cancelShift = (element: HTMLElement) => {
  for (const animation of element.getAnimations())
    if (animation.id === ANIMATION_ID) animation.cancel();
};

const offsetOf = (element: HTMLElement) => {
  const [x = "0", y = "0"] = element.style.translate.split(" ");
  return { x: Number.parseFloat(x) || 0, y: Number.parseFloat(y) || 0 };
};

export const sortable =
  (options: SortableOptions): Attachment<HTMLElement> =>
  (container) => {
    let drag: Drag | null = null;
    let shifting = false;
    let frame = 0;

    const items = () => [...container.querySelectorAll<HTMLElement>(ITEM)];

    const handleOf = (event: Event) => {
      const handle = (event.target as Element | null)?.closest<HTMLElement>(HANDLE) ?? null;
      return handle && container.contains(handle) ? handle : null;
    };

    const shift = async (move: () => void, still?: HTMLElement) => {
      const before = new Map(items().map((element) => [element, element.getBoundingClientRect()]));
      move();
      await tick();
      if (reducedMotion()) return;
      for (const element of items()) {
        const previous = before.get(element);
        if (element === still || !previous) continue;
        cancelShift(element);
        const current = element.getBoundingClientRect();
        const dx = previous.left - current.left;
        const dy = previous.top - current.top;
        if (!dx && !dy) continue;
        element.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }], {
          duration: SHIFT_MS,
          easing: EASING,
          id: ANIMATION_ID,
        });
      }
    };

    const follow = () => {
      if (!drag) return;
      const { item } = drag;
      const dx = drag.x - drag.grabX - (item.offsetLeft - drag.startLeft);
      const dy = drag.y - drag.grabY - (item.offsetTop - drag.startTop);
      item.style.translate = `${dx}px ${dy}px`;
    };

    const targetFor = (current: Drag) => {
      const all = items();
      const from = all.indexOf(current.item);
      if (from < 0) return null;
      const center = draggedCenter(current);
      let index = -1;
      let nearest = Infinity;
      for (const [position, element] of all.entries()) {
        if (element === current.item) continue;
        const gap = distance(center, layoutCenter(element));
        if (gap < nearest) {
          nearest = gap;
          index = position;
        }
      }
      if (index < 0) return null;
      const target = all[index];
      const middle = layoutCenter(target);
      const sameRow = Math.abs(target.offsetTop - current.item.offsetTop) < target.offsetHeight / 2;
      const forward = index > from;
      const passed = sameRow ? forward === center.x > middle.x : forward === center.y > middle.y;
      return passed ? { from, to: index } : null;
    };

    const step = () => {
      if (!drag || shifting) return;
      follow();
      const target = targetFor(drag);
      if (!target) return;
      shifting = true;
      const { item } = drag;
      void shift(() => {
        options.onmove(target.from, target.to);
      }, item).then(() => {
        shifting = false;
        follow();
        frame = requestAnimationFrame(step);
      });
    };

    const settle = (current: Drag) => {
      const { item, restore } = current;
      const offset = offsetOf(item);
      item.style.translate = "";
      item.removeAttribute(DRAGGING);
      const done = () => {
        item.style.position = restore.position;
        item.style.zIndex = restore.zIndex;
        item.style.willChange = restore.willChange;
      };
      if (reducedMotion() || (!offset.x && !offset.y)) {
        done();
        return;
      }
      const animation = item.animate(
        [{ translate: `${offset.x}px ${offset.y}px` }, { translate: "0px 0px" }],
        { duration: SETTLE_MS, easing: EASING },
      );
      void animation.finished.then(done, done);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      if (!drag) return;
      const current = drag;
      drag = null;
      settle(current);
    };

    function onPointerMove(event: PointerEvent) {
      if (drag?.pointerId !== event.pointerId) return;
      drag.x = event.clientX;
      drag.y = event.clientY;
      step();
    }

    function onPointerUp(event: PointerEvent) {
      if (drag?.pointerId === event.pointerId) stop();
    }

    const onPointerDown = (event: PointerEvent) => {
      if (options.disabled || event.button !== 0 || drag) return;
      const item = handleOf(event)?.closest<HTMLElement>(ITEM);
      if (!item) return;
      event.preventDefault();
      cancelShift(item);
      drag = {
        item,
        pointerId: event.pointerId,
        grabX: event.clientX,
        grabY: event.clientY,
        startLeft: item.offsetLeft,
        startTop: item.offsetTop,
        x: event.clientX,
        y: event.clientY,
        restore: {
          position: item.style.position,
          zIndex: item.style.zIndex,
          willChange: item.style.willChange,
        },
      };
      if (getComputedStyle(item).position === "static") item.style.position = "relative";
      item.style.zIndex = "10";
      item.style.willChange = "translate";
      item.setAttribute(DRAGGING, "");
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (drag) event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (options.disabled || drag) return;
      const item = handleOf(event)?.closest<HTMLElement>(ITEM);
      if (!item) return;
      const all = items();
      const from = all.indexOf(item);
      const last = all.length - 1;
      const to = destination(event.key, from, last);
      if (to === null || from < 0) return;
      event.preventDefault();
      if (to < 0 || to > last || to === from) return;
      void shift(() => {
        options.onmove(from, to);
      }).then(() => items()[to]?.querySelector<HTMLElement>(HANDLE)?.focus());
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("keydown", onKeyDown);

    return () => {
      stop();
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("keydown", onKeyDown);
    };
  };
