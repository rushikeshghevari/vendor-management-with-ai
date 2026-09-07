import { useMemo, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';

// Self-contained param typing (not tied to one specific stack's ParamList) — this screen is
// registered under the same 'PdfViewer' name/params shape in several stacks (Requirements,
// Bills, ...) that each otherwise have nothing else in common.
type PdfViewerParamList = { PdfViewer: { url: string; title?: string } };
type Props = NativeStackScreenProps<PdfViewerParamList, 'PdfViewer'>;

const PDFJS_VERSION = '3.11.174';

/** Renders every page of the PDF onto a <canvas> via pdf.js (loaded from cdnjs) — the actual
 *  PDF bytes are fetched by the WebView's own JS engine (device-to-server, works for both a
 *  `localhost` dev URL over adb reverse and a real production URL), never handed to the OS as
 *  a raw `application/pdf` response. That raw-response hand-off is what makes Android's WebView
 *  fall back to the download manager instead of displaying anything — this sidesteps it
 *  entirely since the WebView only ever navigates to an HTML page. */
function buildPdfViewerHtml(url: string): string {
  const safeUrl = JSON.stringify(url);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0" />
<style>
  html, body { margin: 0; padding: 0; background: #525659; }
  #container { width: 100%; padding: 0 0 32px; box-sizing: border-box; }
  canvas { display: block; width: 100%; height: auto; margin-top: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.4); }
  #status { color: #fff; text-align: center; padding: 48px 20px; font-family: sans-serif; font-size: 14px; }
</style>
</head>
<body>
<div id="status">Loading document…</div>
<div id="container"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js"></script>
<script>
  var statusEl = document.getElementById('status');
  var container = document.getElementById('container');
  function reportError(msg) {
    statusEl.textContent = 'Could not display this document: ' + msg;
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('error: ' + msg);
  }
  window.onerror = function (msg) { reportError(msg); };
  var loadTimeout = setTimeout(function () { reportError('timed out loading document'); }, 20000);
  try {
    // Cross-origin Worker creation (the worker script is on cdnjs, the page's own origin is
    // the PDF's own host — see baseUrl below) is blocked by same-origin restrictions in most
    // WebView engines, silently hanging pdf.js forever. Parsing on the main thread instead
    // sidesteps that entirely — fine for a single quotation/invoice-sized PDF.
    pdfjsLib.GlobalWorkerOptions.workerSrc = false;
    pdfjsLib.getDocument({ url: ${safeUrl}, disableWorker: true }).promise.then(function (pdf) {
      clearTimeout(loadTimeout);
      statusEl.style.display = 'none';
      var renderPage = function (num) {
        pdf.getPage(num).then(function (page) {
          // CSS stretches the canvas to the full screen width regardless (see #container/canvas
          // rules) — render at a high enough internal resolution, relative to the page's own
          // width and the device's pixel density, that the text stays crisp once stretched,
          // rather than a fixed scale that left it small and undersized on a full-width screen.
          var targetCssWidth = document.documentElement.clientWidth || window.innerWidth;
          var baseViewport = page.getViewport({ scale: 1 });
          var renderScale = (targetCssWidth / baseViewport.width) * Math.min(window.devicePixelRatio || 1.5, 3);
          var viewport = page.getViewport({ scale: renderScale });
          var canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          container.appendChild(canvas);
          page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport });
          if (num < pdf.numPages) renderPage(num + 1);
        });
      };
      renderPage(1);
    }).catch(function (err) {
      clearTimeout(loadTimeout);
      reportError(err && err.message ? err.message : String(err));
    });
  } catch (err) {
    clearTimeout(loadTimeout);
    reportError(err && err.message ? err.message : String(err));
  }
</script>
</body>
</html>`;
}

function buildImageHtml(url: string): string {
  const safeUrl = JSON.stringify(url);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  html, body { margin: 0; padding: 0; background: #000; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body><img src=${safeUrl} /></body>
</html>`;
}

/** Renders a PDF (or image) attachment inside the app, instead of handing off to whatever
 *  external app the OS resolves for the URL (the old Linking.openURL behavior). */
export function PdfViewerScreen({ navigation, route }: Props) {
  const { url, title } = route.params;
  const [hasError, setHasError] = useState(false);

  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(url);
  const html = useMemo(() => (isImage ? buildImageHtml(url) : buildPdfViewerHtml(url)), [url, isImage]);

  return (
    <Screen padded={false}>
      <AppHeader title={title ?? 'Document'} leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      {hasError ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-center text-sm text-ink-muted dark:text-slate-400">
            Could not display this document here.
          </Text>
          <Text
            className="mt-3 text-sm font-semibold text-primary-600"
            onPress={() => Linking.openURL(url).catch(() => Alert.alert('Could Not Open', 'No app available to open this file.'))}
          >
            Open in another app instead
          </Text>
        </View>
      ) : (
        <WebView
          source={{ html, baseUrl: url }}
          originWhitelist={['*']}
          style={{ flex: 1 }}
          startInLoadingState
          renderLoading={() => <Loader fullscreen />}
          onError={() => setHasError(true)}
          onMessage={(event) => console.warn('[PdfViewer]', event.nativeEvent.data)}
        />
      )}
    </Screen>
  );
}
