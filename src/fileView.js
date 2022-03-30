import marked from 'marked'

import {
  renderHTML
} from './render/htmlWrapper'
import {
  renderPath
} from './render/pathUtil'
import {
  renderMarkdown
} from './render/mdRenderer'

import {
  preview,
  extensions
} from './render/fileExtension'

/**
 * Render code blocks with the help of marked and Markdown grammar
 *
 * @param {Object} file Object representing the code file to preview
 * @param {string} lang The markdown code language string, usually just the file extension
 */
async function renderCodePreview(file, lang) {
  const resp = await fetch(file['@microsoft.graph.downloadUrl'])
  const content = await resp.text()
  const toMarkdown = `\`\`\`${lang}\n${content}\n\`\`\``
  const renderedCode = marked(toMarkdown)
  return `<div class="markdown-body" style="margin-top: 0;">
            ${renderedCode}
          </div>`
}

/**
 * Render PDF with built-in PDF viewer
 *
 * @param {Object} file Object representing the PDF to preview
 */
function renderPDFPreview(file) {
  return `<div id="pdf-preview-wrapper"></div>
          <div class="loading-label">
            <i class="fas fa-spinner fa-pulse"></i>
            <span id="loading-progress">Loading PDF...</span>
          </div>
          <script>
          // No variable declaration. Described in https://github.com/spencerwooo/onedrive-cf-index/pull/46
          loadingLabel = document.querySelector('.loading-label')
          loadingProgress = document.querySelector('#loading-progress')
          function progress({ loaded, total }) {
            loadingProgress.innerHTML = 'Loading PDF... ' + Math.round(loaded / total * 100) + '%'
          }

          fetch('${file['@microsoft.graph.downloadUrl']}').then(response => {
            if (!response.ok) {
              loadingLabel.innerHTML = '😟 ' + response.status + ' ' + response.statusText
              throw Error(response.status + ' ' + response.statusText)
            }
            if (!response.body) {
              loadingLabel.innerHTML = '😟 ReadableStream not yet supported in this browser. Please download the PDF directly using the button below.'
              throw Error('ReadableStream not yet supported in this browser.')
            }

            const contentEncoding = response.headers.get('content-encoding')
            const contentLength = response.headers.get(contentEncoding ? 'x-file-size' : 'content-length')
            if (contentLength === null) {
              loadingProgress.innerHTML = 'Loading progress unavailable. Please wait or download the PDF directly using the button below.'
              console.error('Response size header unavailable')
              return response
            }

            const total = parseInt(contentLength, 10)
            let loaded = 0

            return new Response(
              new ReadableStream({
                start(controller) {
                  const reader = response.body.getReader()

                  read()
                  function read() {
                    reader.read().then(({ done, value }) => {
                      if (done) {
                        controller.close()
                        return
                      }
                      loaded += value.byteLength
                      progress({ loaded, total })
                      controller.enqueue(value)
                      read()
                    }).catch(error => {
                      console.error(error)
                      controller.error(error)
                    })
                  }
                }
              })
            )
          })
            .then(resp => resp.blob())
            .then(blob => {
              const pdfFile = new Blob([blob], { type: 'application/pdf' })
              const pdfFileUrl = URL.createObjectURL(pdfFile)
              loadingLabel.classList.add('fade-out-bck')

              setTimeout(() => {
                loadingLabel.remove()
                document.querySelector('#pdf-preview-wrapper').classList.add('fade-in-fwd')
                PDFObject.embed(pdfFileUrl, '#pdf-preview-wrapper', {
                  height: '80vh',
                  fallbackLink: '<p>😟 This browser does not support previewing PDF, please download the PDF directly using the button below.</p>'
                })
              }, 600)
            })
          </script>`
}

/**
 * Render image (jpg, png or gif)
 *
 * @param {Object} file Object representing the image to preview
 */
function renderImage(file) {
  return `<div class="image-wrapper">
            <img data-zoomable src="${file['@microsoft.graph.downloadUrl']}" alt="${file.name}" style="width: 100%; height: auto; position: relative;"></img>
          </div>`
}

/**
 * Render video (mp4, flv, m3u8, webm ...)
 *
 * @param {Object} file Object representing the video to preview
 * @param {string} fileExt The file extension parsed
 */
function renderVideoPlayer(file, fileExt) {
  return `<div>
    <div class="artplayer-app" style="width: auto; height: 60vh; position: relative;"></div>
    <table class="timeline" cellpadding="10px" cellspacing="0"></table>
  </div>
  <script>
  var danmaku_area = 0.05
  var art = new Artplayer({
    container: document.querySelector('.artplayer-app'),
    url: '${file['@microsoft.graph.downloadUrl']}',
    plugins: [artplayerPluginDanmuku({
        danmuku: 'https://dm.asdanmaku.com/Xml/${file.name.replace('.mp4', '.xml')}',
        speed: 11,
        // 全局持续时间
        opacity: 0.7,
        // 全局透明度
        size: 30,
        // 全局字体大小
        maxlength: 100,
        // 全局最大长度
        synchronousPlayback: true,
        // 是否同步到播放速度
        margin: [0, 0]
    }), ],
    settings: [{
            width: 150,
            html: '弹幕开关',
            selector: [{
                    default: true,
                    html: '显示',
                    showDanmuku: true
                },
                {
                    html: '隐藏',
                    showDanmuku: false
                },
            ],
            onSelect: function (item) {
                if (item.showDanmuku) {
                    art.plugins.artplayerPluginDanmuku.show();
                } else {
                    art.plugins.artplayerPluginDanmuku.hide();
                }
            },
        },
        {
          width: 150,
          html: '弹幕显示区域',
          selector: [{
                  html: '四分之一屏',
                  danmaku_area: 0.75
              },
              {
                  html: '半屏',
                  danmaku_area: 0.5
              },
              {
                  html: '四分之三屏',
                  danmaku_area: 0.25
              },
              {
                  default: true,
                  html: '全屏',
                  danmaku_area: 0.05
              },
          ],
          onSelect: function (item) {
              danmaku_area = item.danmaku_area;
              art.plugins.artplayerPluginDanmuku.config().option.margin[1] = art.height * item.danmaku_area;
          },
        },
        {
            width: 150,
            html: '弹幕大小',
            selector: [{
                    html: '较小 (15px)',
                    size: 15
                },
                {
                    html: '小 (20px)',
                    size: 20
                },
                {
                    default: true,
                    html: '较小 (25px)',
                    size: 25
                },
                {
                    html: '适中 (30px)',
                    size: 30
                },
                {
                    html: '较大 (40px)',
                    size: 40
                },
                {
                    html: '很大 (50px)',
                    size: 50
                },
            ],
            onSelect: function (item) {
                art.plugins.artplayerPluginDanmuku.config({
                    fontSize: item.size,
                }).option.margin[1] = art.height * danmaku_area;
            },
        },
        {
            width: 150,
            html: '弹幕不透明度',
            selector: [{
                    html: '30%',
                    opacity: 0.3
                },
                {
                    html: '50%',
                    opacity: 0.5
                },
                {
                    default: true,
                    html: '70%',
                    opacity: 0.7
                },
                {
                    html: '90%',
                    opacity: 0.9
                },
                {
                    html: '100%',
                    opacity: 1.0
                }
            ],
            onSelect: function (item) {
                art.plugins.artplayerPluginDanmuku.config({
                    opacity: item.opacity,
                }).option.margin[1] = art.height * danmaku_area;
            },
        }
    ],
    setting: true,
    whitelist: ['*'],
    autoSize: true,
    autoMini: true,
    flip: true,
    volume: 0.5,
    rotate: true,
    playbackRate: true,
    hotkey: true,
    pip: true,
    fullscreen: true,
    fullscreenWeb: true,
});

pluginOption = art.plugins.artplayerPluginDanmuku.config().option;
art.on('resize', () => {
    pluginOption.margin[1] = art.height * danmaku_area;
});

fetch('https://dm.asdanmaku.com/Pbf/${file.name.replace('.mp4', '.pbf')}')
    .then(response => response.text())
    .then(rawPBFStr => {

        var timelineTable = document.querySelector('.timeline')
        var highlight = []

        var rawPBFList = rawPBFStr.split(/[(\\r\\n)\\r\\n]+/);
        rawPBFList.shift()
        rawPBFList.forEach(PBFItem => {
            if (!PBFItem) {
                return
            }
            var PBFParts = PBFItem.split('*')
            if (PBFParts.length <= 2) {
                return
            }
            var timeMarker = PBFParts.shift()
            var timeMarkerParts = timeMarker.split('=')
            var time = parseInt(timeMarkerParts[1]) / 1000
            var text = PBFParts[0]

            timeButtonTd = document.createElement('td');
            timeButtonTd.innerText = new Date(time * 1000).toISOString().substr(11, 8);
            timeTextTd = document.createElement('td');
            timeTextTd.innerText = text;

            timelineRow = document.createElement('tr');
            timelineRow.style.cursor = "pointer";
            timelineRow.addEventListener('click', () => {
                art.seek = time;
            })
            timelineRow.appendChild(timeButtonTd);
            timelineRow.appendChild(timeTextTd);
            timelineTable.appendChild(timelineRow);

            highlight.push({
                "time": time,
                "text": text
            });
        });

        console.log(highlight)
        art.option.highlight = highlight;
    })
</script>
<style>
  .timeline tr:hover td{
    background-color:#cccccc;
  }
  @media (prefers-color-scheme: dark) {
    .timeline tr:hover td{
      background-color:#333333;
    }
    .timeline td{
      color:white;
    }
  }
</style>`
}

/**
 * Render audio (mp3, aac, wav, oga ...)
 *
 * @param {Object} file Object representing the audio to preview
 */
function renderAudioPlayer(file) {
  return `<div id="aplayer"></div>
          <script>
          ap = new APlayer({
            container: document.getElementById('aplayer'),
            theme: '#0070f3',
            audio: [{
              name: '${file.name.replace(/'/g, '%27')}',
              url: '${file['@microsoft.graph.downloadUrl']}'
            }]
          })
          </script>`
}

/**
 * File preview fallback
 *
 * @param {string} fileExt The file extension parsed
 */
function renderUnsupportedView(fileExt) {
  return `<div class="markdown-body" style="margin-top: 0;">
            <p>Sorry, we don't support previewing <code>.${fileExt}</code> files as of today. You can download the file directly.</p>
          </div>`
}

/**
 * Render preview of supported file format
 *
 * @param {Object} file Object representing the file to preview
 * @param {string} fileExt The file extension parsed
 */
async function renderPreview(file, fileExt, cacheUrl) {
  if (cacheUrl) {
    // This will change your download url too! (proxied download)
    file['@microsoft.graph.downloadUrl'] = cacheUrl
  }

  switch (extensions[fileExt]) {
    case preview.markdown:
      return await renderMarkdown(file['@microsoft.graph.downloadUrl'], '', 'style="margin-top: 0;"')

    case preview.text:
      return await renderCodePreview(file, '')

    case preview.image:
      return renderImage(file)

    case preview.code:
      return await renderCodePreview(file, fileExt)

    case preview.pdf:
      return renderPDFPreview(file)

    case preview.video:
      return renderVideoPlayer(file, fileExt)

    case preview.audio:
      return renderAudioPlayer(file)

    default:
      return renderUnsupportedView(fileExt)
  }
}

export async function renderFilePreview(file, path, fileExt, cacheUrl) {
  const el = (tag, attrs, content) => `<${tag} ${attrs.join(' ')}>${content}</${tag}>`
  const div = (className, content) => el('div', [`class=${className}`], content)

  const body = div(
    'container',
    div('path', renderPath(path) + ` / ${file.name}`) +
    div('items', el('div', ['style="padding: 1rem 1rem;"'], await renderPreview(file, fileExt, cacheUrl))) +
    div(
      'download-button-container',
      el(
        'a',
        ['class="download-button"', `href="${file['@microsoft.graph.downloadUrl']}"`, 'data-turbolinks="false"'],
        '<i class="far fa-arrow-alt-circle-down"></i> DOWNLOAD'
      )
    )
  )
  return renderHTML(body)
}
