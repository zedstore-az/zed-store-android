# ZED STORE — Push bildirişlərinin sazlanması

Bu dəyişiklik Chrome/Edge brauzerində Web Push bildirişlərini aktivləşdirir. Service Worker bildirişləri brauzer nişanı bağlı olduqda da göstərə bilər.

## Vacib uyğunluq qeydi

- Android Chrome: dəstəklənir (HTTPS, bildiriş icazəsi və quraşdırılmış Service Worker tələb olunur).
- PC Chrome/Edge: dəstəklənir.
- Hazırkı Android APK: tətbiq Android WebView istifadə edir və Web Push API-ni təmin etmir. APK-də tətbiq bağlı olanda bildiriş üçün Firebase Cloud Messaging (FCM) native inteqrasiyası ayrıca tələb olunur; bu repoda FCM layihə konfiqurasiyası yoxdur.
- ChatGPT daxili brauzeri və digər məhdud WebView-lər dəstəklənməyə bilər.

## 1. Database migration

`20261101090000_web_push_subscriptions.sql` migration-ını ZED STORE Supabase layihəsinə tətbiq et. Bu migration yalnız `push_subscriptions` cədvəlini və sahibinə bağlı RLS siyasətlərini yaradır.

## 2. VAPID açarlarını yarat

Node.js olan kompüterdə:
```bash
npx --yes web-push generate-vapid-keys
```

Yaranan Public Key və Private Key-i ayrıca saxla. Private Key-i heç vaxt GitHub-a, frontend koduna və ya istifadəçi brauzerinə yerləşdirmə.

## 3. Supabase Function secrets

Supabase Dashboard → Project Settings → Edge Functions → Secrets bölməsində bu dəyərləri əlavə et:

- `VAPID_PUBLIC_KEY` — yaratdığın Public Key
- `VAPID_PRIVATE_KEY` — yaratdığın Private Key
- `VAPID_SUBJECT` — `mailto:admin@zedstore.az` (öz idarəetmə e-poçtunu yaz)
- `PUSH_WEBHOOK_SECRET` — uzun, təsadüfi və məxfi dəyər

`SUPABASE_URL` və `SUPABASE_SERVICE_ROLE_KEY` Supabase Edge Functions runtime tərəfindən təmin olunmalıdır. Service role açarını heç vaxt frontend-ə yazma.

## 4. Edge Function deploy

Repo kökündən:
```bash
supabase functions deploy zed-web-push --no-verify-jwt
```

Function GET sorğusunda yalnız VAPID Public Key qaytarır. POST sorğusu yalnız `x-push-webhook-secret` düzgün olduqda qəbul edilir.

## 5. Database Webhook

Supabase Dashboard → Database → Webhooks → Create webhook:

- Name: `zed-store-push-notifications`
- Table: `public.notifications`
- Event: `INSERT`
- Type: Supabase Edge Function
- Function: `zed-web-push`
- Method: `POST`
- Header: `x-push-webhook-secret: <PUSH_WEBHOOK_SECRET ilə eyni dəyər>`
- Header: `Content-Type: application/json`

Webhook yalnız yeni bildiriş yazılanda işləyir. Bildirişin sahibi üzrə push subscription-lar tapılır və hər cihaz üçün ayrıca göndərilir.

## 6. İstifadəçi aktivləşdirməsi

Migration, Function, secrets və webhook qurulduqdan sonra:
1. ZED STORE-u Android Chrome və ya PC Chrome/Edge-də HTTPS ilə aç.
2. Hesaba daxil ol və Bildirişlər bölməsinə keç.
3. “Bildirişləri aktiv et” düyməsini bas və brauzer icazəsini təsdiqlə.
4. Sınaq üçün ZED STORE daxilində yeni sifariş və ya stok xəbərdarlığı yarat.

## Təhlükəsizlik

- Push subscription cədvəlində RLS aktivdir; istifadəçi yalnız öz cihaz abunəliyini idarə edə bilər.
- Private VAPID key yalnız Edge Function secret kimi saxlanır.
- Webhook üçün ayrıca məxfi header yoxlanılır.
- 404/410 qaytaran köhnəlmiş subscription-lar avtomatik silinir.
