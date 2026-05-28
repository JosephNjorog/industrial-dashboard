package com.example.industrialdashboard.ui.main

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.view.ViewGroup
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation3.runtime.NavKey

private const val PREFS_NAME = "IndustrialPrefs"
private const val KEY_URL = "dashboard_url"
private const val DEFAULT_URL = "https://industrial-dashboard-k33nt.vercel.app"

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MainScreen(
  onItemClick: (NavKey) -> Unit,
  modifier: Modifier = Modifier,
) {
  val context = LocalContext.current
  val sharedPreferences = remember { context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE) }
  
  var currentUrl by remember { mutableStateOf(sharedPreferences.getString(KEY_URL, DEFAULT_URL) ?: DEFAULT_URL) }
  var webViewInstance by remember { mutableStateOf<WebView?>(null) }
  
  var isLoading by remember { mutableStateOf(false) }
  var isError by remember { mutableStateOf(false) }
  var errorMessage by remember { mutableStateOf("") }
  var showSettingsDialog by remember { mutableStateOf(false) }
  var settingsUrlInput by remember { mutableStateOf(currentUrl) }

  // Handle hardware back navigation in the WebView
  BackHandler(enabled = webViewInstance?.canGoBack() == true) {
    webViewInstance?.goBack()
  }

  Box(modifier = modifier.fillMaxSize().background(Color(0xFF0F172A))) { // Tech background (Slate 900)
    if (!isError) {
      AndroidView(
        factory = { ctx ->
          WebView(ctx).apply {
            layoutParams = ViewGroup.LayoutParams(
              ViewGroup.LayoutParams.MATCH_PARENT,
              ViewGroup.LayoutParams.MATCH_PARENT
            )
            webViewClient = object : WebViewClient() {
              override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                isLoading = true
                isError = false
              }

              override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                isLoading = false
              }

              override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
              ) {
                super.onReceivedError(view, request, error)
                // Filter out minor resource errors and focus on main page loading issues
                if (request?.isForMainFrame == true) {
                  isLoading = false
                  isError = true
                  errorMessage = error?.description?.toString() ?: "Unknown Connection Error"
                }
              }
            }

            settings.apply {
              javaScriptEnabled = true
              domStorageEnabled = true
              databaseEnabled = true
              loadWithOverviewMode = true
              useWideViewPort = true
              builtInZoomControls = true
              displayZoomControls = false // Hide zoom controls, use gestures
              allowFileAccess = true
              mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }
            
            webViewInstance = this
            loadUrl(currentUrl)
          }
        },
        update = { webView ->
          // Reload if the URL has changed in settings
          if (webView.url != currentUrl) {
            webView.loadUrl(currentUrl)
          }
        },
        modifier = Modifier.fillMaxSize()
      )
    }

    // High performance Progress Indicator
    if (isLoading) {
      LinearProgressIndicator(
        modifier = Modifier.fillMaxWidth().height(3.dp).align(Alignment.TopCenter),
        color = Color(0xFF00F0FF), // Cyber Cyan indicator
        trackColor = Color.Transparent
      )
    }

    // Connection Error Panel
    if (isError) {
      Column(
        modifier = Modifier
          .fillMaxSize()
          .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
      ) {
        Text(
          text = "⚠️",
          fontSize = 64.sp
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
          text = "COMMUNICATION LOST",
          color = Color(0xFFFF2D55), // Cyber Danger (Red)
          fontSize = 20.sp,
          fontWeight = FontWeight.Bold,
          letterSpacing = 1.5.sp,
          textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
          text = "Unable to connect to the factory dashboard server. Check the URL endpoint or verify network status.",
          color = Color(0xFF8DA0B6),
          fontSize = 14.sp,
          textAlign = TextAlign.Center,
          modifier = Modifier.padding(horizontal = 16.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Card(
          colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
          modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp)
        ) {
          Text(
            text = currentUrl,
            fontFamily = FontFamily.Monospace,
            fontSize = 12.sp,
            color = Color(0xFF00F0FF),
            modifier = Modifier.padding(12.dp).align(Alignment.CenterHorizontally),
            textAlign = TextAlign.Center
          )
        }
        Spacer(modifier = Modifier.height(24.dp))
        Row(
          horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
          Button(
            onClick = {
              showSettingsDialog = true
              settingsUrlInput = currentUrl
            },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155))
          ) {
            Icon(Icons.Default.Settings, contentDescription = "Configure")
            Spacer(modifier = Modifier.width(8.dp))
            Text("Configure")
          }
          Button(
            onClick = {
              isError = false
              webViewInstance?.loadUrl(currentUrl)
            },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00F0FF), contentColor = Color(0xFF0F172A))
          ) {
            Icon(Icons.Default.Refresh, contentDescription = "Retry")
            Spacer(modifier = Modifier.width(8.dp))
            Text("Retry")
          }
        }
      }
    }

    // Floating Configuration Gear button (semitransparent, premium UI)
    if (!isError) {
      Box(
        modifier = Modifier
          .fillMaxSize()
          .padding(bottom = 16.dp, end = 16.dp),
        contentAlignment = Alignment.BottomEnd
      ) {
        IconButton(
          onClick = {
            settingsUrlInput = currentUrl
            showSettingsDialog = true
          },
          modifier = Modifier
            .size(44.dp)
            .background(Color(0x991E293B), shape = CircleShape)
            .alpha(0.6f)
        ) {
          Icon(
            imageVector = Icons.Default.Settings,
            contentDescription = "Settings",
            tint = Color(0xFF00F0FF) // Cyber Cyan
          )
        }
      }
    }

    // Settings Dialog overlay
    if (showSettingsDialog) {
      AlertDialog(
        onDismissRequest = { showSettingsDialog = false },
        title = {
          Text(
            text = "ENDPOINT CONFIGURATION",
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            letterSpacing = 1.sp
          )
        },
        text = {
          Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
              text = "Input the target Vercel URL or local dashboard IP address:",
              fontSize = 13.sp,
              color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            OutlinedTextField(
              value = settingsUrlInput,
              onValueChange = { settingsUrlInput = it },
              singleLine = true,
              textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace, fontSize = 12.sp),
              modifier = Modifier.fillMaxWidth(),
              placeholder = { Text("https://example.vercel.app", fontSize = 12.sp) }
            )
          }
        },
        confirmButton = {
          TextButton(
            onClick = {
              var formattedUrl = settingsUrlInput.trim()
              if (formattedUrl.isNotEmpty() && !formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
                formattedUrl = "https://$formattedUrl"
              }
              sharedPreferences.edit().putString(KEY_URL, formattedUrl).apply()
              currentUrl = formattedUrl
              showSettingsDialog = false
              isError = false
              webViewInstance?.loadUrl(formattedUrl)
            }
          ) {
            Text("SAVE & RELOAD", color = Color(0xFF00F0FF))
          }
        },
        dismissButton = {
          Row {
            TextButton(
              onClick = {
                settingsUrlInput = DEFAULT_URL
              }
            ) {
              Text("RESET TO DEFAULT", color = Color(0xFFFF2D55))
            }
            Spacer(modifier = Modifier.width(8.dp))
            TextButton(
              onClick = { showSettingsDialog = false }
            ) {
              Text("CANCEL")
            }
          }
        }
      )
    }
  }
}
