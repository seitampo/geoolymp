import { NextRequest, NextResponse } from "next/server";

/**
 * Редирект обратно на страницу формы с сообщением об ошибке в query-параметре.
 * Используется для ошибок валидации, которые пользователь может встретить в обычном
 * сценарии (неверный пароль, занятый email, неправильный код и т.п.), чтобы вместо
 * сырого JSON он видел человекочитаемое сообщение на самой форме.
 */
export function redirectWithError(request: NextRequest, redirectTo: string, message: string) {
  const url = new URL(redirectTo, request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}

/** Успешный редирект после POST (303 — чтобы браузер сделал GET и не повторял форму). */
export function redirectAfterPost(request: NextRequest, redirectTo: string) {
  return NextResponse.redirect(new URL(redirectTo, request.url), 303);
}

/**
 * Редирект с сообщением об успехе (?ok=) — симметрия к redirectWithError.
 * Понимает адреса с якорем: параметр вставляется до «#», чтобы браузер
 * и показал баннер, и проскроллил к нужному блоку.
 */
export function redirectWithSuccess(request: NextRequest, redirectTo: string, message: string) {
  const [path, fragment] = redirectTo.split("#");
  const url = new URL(path, request.url);
  url.searchParams.set("ok", message);
  if (fragment) {
    url.hash = fragment;
  }
  return NextResponse.redirect(url, 303);
}
