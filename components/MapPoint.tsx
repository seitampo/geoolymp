"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

/**
 * Интерактивные картозадачи. Все координаты — в процентах ШИРИНЫ изображения
 * (y тоже): так расстояние до цели считается в одних единицах и не зависит
 * от размера экрана. Для CSS-позиционирования по вертикали процент ширины
 * переводится в процент высоты через соотношение сторон изображения.
 */

type Point = { x: number; y: number };

function clickToWidthPercent(event: MouseEvent<HTMLElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.width) * 100;
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

/** Круг цели (центр + допуск) поверх карты. */
function TargetCircle({ point, radius, aspect }: { point: Point; radius: number; aspect: number }) {
  return (
    <>
      <span
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-green-600 bg-green-500/20"
        style={{
          left: `${point.x}%`,
          top: `${point.y * aspect}%`,
          width: `${radius * 2}%`,
          aspectRatio: "1 / 1",
        }}
      />
      <span
        className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-700"
        style={{ left: `${point.x}%`, top: `${point.y * aspect}%` }}
      />
    </>
  );
}

/** Метка ответа ученика. */
function AnswerMarker({ point, aspect }: { point: Point; aspect: number }) {
  return (
    <span
      className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600 shadow"
      style={{ left: `${point.x}%`, top: `${point.y * aspect}%` }}
    />
  );
}

/**
 * Редактор цели для учителя (формы создания/редактирования задачи).
 * Карта — общее поле «изображение» той же формы: компонент подхватывает выбранный
 * файл и показывает его для клика. Пишет значения в скрытые поля mapTargetX/Y/Radius.
 */
export function MapPointEditor({
  existingImageUrl,
  initialX,
  initialY,
  initialRadius,
}: {
  existingImageUrl?: string;
  initialX?: number;
  initialY?: number;
  initialRadius?: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(existingImageUrl ?? null);
  const [point, setPoint] = useState<Point | null>(
    initialX !== undefined && initialY !== undefined ? { x: initialX, y: initialY } : null,
  );
  const [radius, setRadius] = useState(initialRadius ?? 6);
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    const form = wrapperRef.current?.closest("form");
    const fileInput = form?.querySelector<HTMLInputElement>('input[name="image"]');

    if (!fileInput) {
      return;
    }

    const onChange = () => {
      const file = fileInput.files?.[0];
      if (file) {
        setImageUrl(URL.createObjectURL(file));
        setPoint(null);
      }
    };

    fileInput.addEventListener("change", onChange);
    return () => fileInput.removeEventListener("change", onChange);
  }, []);

  return (
    <div ref={wrapperRef} className="rounded-lg border border-line p-3">
      <p className="text-sm font-medium text-ink-soft">Цель картозадачи</p>
      <p className="mt-0.5 text-xs text-ink-mute">
        Для типа «Клик по карте»: загрузите карту в поле изображения, затем кликните по ней,
        чтобы отметить правильную точку, и подберите допуск.
      </p>

      {imageUrl ? (
        <div className="relative mt-3 cursor-crosshair overflow-hidden rounded-lg border border-line">
          <img
            className="block w-full select-none"
            src={imageUrl}
            alt="Карта задачи"
            draggable={false}
            onLoad={(event) =>
              setAspect(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)
            }
            onClick={(event) => setPoint(clickToWidthPercent(event))}
          />
          {point && <TargetCircle point={point} radius={radius} aspect={aspect} />}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-xs text-ink-mute">
          Карта появится здесь после выбора изображения.
        </p>
      )}

      {imageUrl && (
        <label className="mt-3 block text-xs text-ink-soft">
          Допуск (радиус зоны): <span className="font-medium">{radius}%</span> ширины карты
          <input
            className="mt-1 block w-full accent-rust"
            type="range"
            min={1}
            max={25}
            step={0.5}
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
          />
        </label>
      )}

      <input type="hidden" name="mapTargetX" value={point ? String(point.x) : ""} />
      <input type="hidden" name="mapTargetY" value={point ? String(point.y) : ""} />
      <input type="hidden" name="mapRadius" value={point ? String(radius) : ""} />
    </div>
  );
}

/**
 * Ответ ученика кликом по карте (обычные задачи, тренировка, олимпиада).
 * Пишет "x;y" в скрытое поле answer. В readOnly-режиме показывает сохранённый
 * ответ и, если передана цель, правильную зону (после проверки).
 */
export function MapAnswerInput({
  imageUrl,
  initialAnswer,
  readOnly = false,
  target,
}: {
  imageUrl: string;
  initialAnswer?: string;
  readOnly?: boolean;
  target?: { x: number; y: number; radius: number };
}) {
  const [point, setPoint] = useState<Point | null>(() => {
    if (!initialAnswer) {
      return null;
    }
    const parts = initialAnswer.split(";").map((value) => Number(value.trim()));
    return parts.length === 2 && parts.every(Number.isFinite) ? { x: parts[0], y: parts[1] } : null;
  });
  const [aspect, setAspect] = useState(1);

  return (
    <div>
      {!readOnly && (
        <p className="mb-2 text-sm text-ink-soft">
          Кликните по карте, чтобы отметить ответ{point ? " (можно передвинуть новым кликом)" : ""}.
        </p>
      )}
      <div
        className={`relative overflow-hidden rounded-lg border border-line ${
          readOnly ? "" : "cursor-crosshair"
        }`}
      >
        <img
          className="block w-full select-none"
          src={imageUrl}
          alt="Карта задачи"
          draggable={false}
          onLoad={(event) =>
            setAspect(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)
          }
          onClick={readOnly ? undefined : (event) => setPoint(clickToWidthPercent(event))}
        />
        {target && <TargetCircle point={{ x: target.x, y: target.y }} radius={target.radius} aspect={aspect} />}
        {point && <AnswerMarker point={point} aspect={aspect} />}
      </div>
      {!readOnly && <input type="hidden" name="answer" value={point ? `${point.x};${point.y}` : ""} />}
    </div>
  );
}
