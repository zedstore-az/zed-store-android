package az.zedstore.management;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.*;
import android.view.View;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final int FILE_REQUEST = 702;
    private static final int WEB_PERMISSION_REQUEST = 703;
    private static final int NOTIFICATION_REQUEST = 704;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingWebPermission;
    private final String APP_HOST = "zedstore-management.onrender.com";
    private final String APP_URL = "https://zedstore-management.onrender.com";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xFF020817);
        getWindow().setNavigationBarColor(0xFF020817);

        webView = new WebView(this);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if (host != null && (host.equals(APP_HOST) || host.endsWith(".onrender.com"))) return false;
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()) || "mailto".equals(uri.getScheme()) || "tel".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
                    return true;
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> handleWebPermissionRequest(request));
            }

            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = params.createIntent();
                try { startActivityForResult(intent, FILE_REQUEST); return true; }
                catch (Exception e) { fileCallback = null; return false; }
            }
        });

        setContentView(webView);
        if (state == null) webView.loadUrl(APP_URL); else webView.restoreState(state);

        // Android 13+ requires an explicit runtime grant before the app can post notifications.
        requestNotificationPermissionIfNeeded();
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_REQUEST);
        }
    }

    private void handleWebPermissionRequest(PermissionRequest request) {
        Uri origin = request.getOrigin();
        String host = origin == null ? null : origin.getHost();
        if (host == null || !(host.equals(APP_HOST) || host.endsWith(".onrender.com"))) {
            request.deny();
            return;
        }

        List<String> neededPermissions = new ArrayList<>();
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource) &&
                    checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                neededPermissions.add(Manifest.permission.CAMERA);
            } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource) &&
                    checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                neededPermissions.add(Manifest.permission.RECORD_AUDIO);
            } else if (!PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource) &&
                    !PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                request.deny();
                return;
            }
        }

        if (!neededPermissions.isEmpty()) {
            pendingWebPermission = request;
            requestPermissions(neededPermissions.toArray(new String[0]), WEB_PERMISSION_REQUEST);
        } else {
            request.grant(request.getResources());
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);

        if (requestCode == WEB_PERMISSION_REQUEST && pendingWebPermission != null) {
            boolean allGranted = true;
            for (String resource : pendingWebPermission.getResources()) {
                if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource) &&
                        checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) allGranted = false;
                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource) &&
                        checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) allGranted = false;
            }
            if (allGranted) pendingWebPermission.grant(pendingWebPermission.getResources());
            else pendingWebPermission.deny();
            pendingWebPermission = null;
        }
        // NOTIFICATION_REQUEST is intentionally handled by Android's system UI.
        // The user can change this choice later in App info > Notifications.
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_REQUEST && fileCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            fileCallback.onReceiveValue(results);
            fileCallback = null;
        }
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
