# Android runtime icazələri — ZED STORE

Bu yeniləmə Android tətbiqinin manifestinə POST_NOTIFICATIONS icazəsini əlavə edir və Android 13+ (API 33+) cihazlarda tətbiq ilk açılanda sistem bildiriş icazəsi pəncərəsini göstərir.

Kamera və mikrofon icazələri əvvəlcədən istənilmir. Veb tətbiq həmin funksiyalardan istifadə etdikdə Android sistem icazəsi ayrıca çıxır; istifadəçi razılıq verərsə WebView-ə yalnız tələb olunan kamera/mikrofon resursları açılır.

## İstifadəçi nə görəcək?
- Android 13+: ilk açılışda “Bildirişlərə icazə verilsin?” sistem pəncərəsi.
- Kamera: kamera funksiyası ilk dəfə açıldıqda icazə.
- Mikrofon: mikrofon tələb edən funksiya ilk dəfə açıldıqda icazə.
- İcazələr sonradan telefonun Settings → Apps → ZED STORE → Permissions/Notifications bölməsindən dəyişdirilə bilər.

Qeyd: POST_NOTIFICATIONS icazəsinin əlavə edilməsi sistem ayarlarında bildiriş açarını aktivləşdirir və icazə dialoqunu göstərir. Bu, öz-özlüyündə push göndərmə mexanizmi yaratmır. Tətbiq bağlı olduqda bildiriş göndərilməsi üçün Firebase Cloud Messaging (FCM) SDK, Firebase layihə konfiqurasiyası, cihaz tokeninin serverə qeydiyyatı və serverdən FCM göndərişi ayrıca inteqrasiya edilməlidir.
