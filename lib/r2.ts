import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 через S3-совместимый API. Файлы приватные: наружу их отдают
 * только наши роуты после проверки прав, поэтому bucket не публичный, а доступ
 * идёт по секретным ключам из окружения.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set for R2 storage.`);
  }
  return value;
}

let cachedClient: S3Client | null = null;

function client(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return cachedClient;
}

function bucket(): string {
  return required("R2_BUCKET_NAME");
}

function isNotFound(error: unknown): boolean {
  const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404;
}

export async function r2PutObject(key: string, body: Buffer, contentType?: string) {
  await client().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  );
}

/**
 * Читает объект целиком. Возвращает null, если объекта нет.
 * Оборачиваем в новый Uint8Array (бэкенд — обычный ArrayBuffer), чтобы результат
 * подходил под BodyInit ответа Next (у `transformToByteArray` бэкенд — ArrayBufferLike).
 */
export async function r2GetObject(key: string) {
  try {
    const response = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return new Uint8Array(await response.Body!.transformToByteArray());
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

/** Удаление объекта. Отсутствие объекта не считается ошибкой. */
export async function r2DeleteObject(key: string) {
  try {
    await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }
}

/** Копирование объекта. Возвращает false, если исходного объекта нет. */
export async function r2CopyObject(sourceKey: string, destinationKey: string): Promise<boolean> {
  try {
    await client().send(
      new CopyObjectCommand({
        Bucket: bucket(),
        CopySource: `${bucket()}/${sourceKey}`,
        Key: destinationKey,
      }),
    );
    return true;
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
}

/** Суммарный размер всех объектов в байтах — для контроля потолка хранилища. */
export async function r2TotalBytes(): Promise<number> {
  let total = 0;
  let continuationToken: string | undefined;

  do {
    const response = await client().send(
      new ListObjectsV2Command({ Bucket: bucket(), ContinuationToken: continuationToken }),
    );
    for (const object of response.Contents ?? []) {
      total += object.Size ?? 0;
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return total;
}
