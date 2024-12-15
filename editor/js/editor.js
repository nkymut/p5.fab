var initSketch = false;

var codeEditor = {
  allCode: null,
  appendCode: function (toAppend) {
    // if the same code doesnt already exist
    if (this.allCode.indexOf(toAppend) === -1) {
      var sketchDOM = $(this.allCode);

      // find the fabPreview element
      var srcIndex = _.findIndex(sketchDOM, function (elem) {
        return elem.id === "fabPreview";
      });
      var src = sketchDOM[srcIndex].text;
      var newSrc = src + "\n" + toAppend + "\n";

      this.allCode = this.allCode.replace(src, newSrc);
    }
  },
};

// Initialize CodeMirror editor
var editor = CodeMirror(document.getElementById("code"), {
  theme: "paraiso-light",
  mode: { name: "javascript", globalVars: true },
  styleActiveLine: true,
  lineNumbers: true,
  lineWrapping: false,
  autoCloseBrackets: true,
  // styleSelectedText: true,
  // extraKeys: {
  //   "Tab": "indentMore"
  // }
});

function hideHTMLFromEditor() {
  if (!editor || editor.lineCount() === 0) {
    console.warn("Editor not ready yet");
    return;
  }

  var options = {
    collapsed: true,
    inclusiveLeft: true,
    inclusiveRight: true,
  };

  // hide the head of <html><body><script>
  editor.markText({ line: 0, ch: 0 }, { line: 0 }, options);
  // hide closing tags </script></html>
  editor.markText({ line: editor.lastLine(), ch: 0 }, { line: editor.lastLine() }, options);
}

// Replace the setTimeout with a proper initialization sequence
function initializeEditor() {
  if (sessionStorage.getItem("fabPreview")) {
    console.log("sessionstorage"); // this is run when you refresh the page
    codeEditor.allCode = sessionStorage.getItem("fabPreview");
    editor.setValue(codeEditor.allCode);
    editor.on("change", function onFirstChange() {
      editor.off("change", onFirstChange);
      hideHTMLFromEditor();
      // Run updatePreview after editor is ready
      requestAnimationFrame(updatePreview);
    });
  } else {
    console.log("else"); // this is run the first time its opened
    $.get("js/fabPreview.html", function (data) {
      sessionStorage.setItem("fabPreview", data);
      codeEditor.allCode = data;
      editor.setValue(data);
      editor.on("change", function onFirstChange() {
        editor.off("change", onFirstChange);
        hideHTMLFromEditor();
        // Run updatePreview after editor is ready
        requestAnimationFrame(updatePreview);
      });
    });
  }
}

// Replace setTimeout(updatePreview, 200) with:
initializeEditor();

function updatePreview() {
  // Add validation
  if (!editor || !editor.getValue()) {
    console.warn("Editor not ready for preview update");
    requestAnimationFrame(updatePreview); // Try again next frame
    return;
  }

  var previewFrame = document.getElementById("preview");
  if (!previewFrame) {
    console.warn("Preview frame not ready");
    requestAnimationFrame(updatePreview); // Try again next frame
    return;
  }

  var preview = previewFrame.contentDocument || previewFrame.contentWindow.document;
  var fullCode = editor.getValue();

  if (!initSketch) {
    // write fabPreview.html to the iframe
    preview.open();
    preview.write(fullCode);
    preview.close();
    initSketch = true;
    var userCode = fullCode.split(/<script id='fabPreview'>let fab;|<\/script><\/body><\/html>/)[1];
    if (userCode) {
      var beautified = js_beautify(userCode, { indent_size: 2 });
      editor.setValue(beautified);
      flashCode();
      evaluateJs(userCode);
    }
  } else {
    evaluateJs(fullCode);
    evaluateJs("_once = false;");
    var beautified = js_beautify(fullCode, { indent_size: 2 });
    var scrollPos = editor.getScrollInfo();
    editor.setValue(beautified);
    flashCode();
    editor.scrollTo(scrollPos["left"], scrollPos["top"]); // preserve scroll location after flashing
  }
}

//run the code in the editor for the first time
setTimeout(updatePreview, 200);

// functionality inspired from hydra, credit: https://github.com/hydra-synth/hydra/blob/aeea1cd794f9943356a5079b4911e9f8c3278bdc/frontend/web-editor/src/views/editor/editor.js#L122
function flashCode(start, end) {
  console.log("flash code!");
  if (!editor.getValue()) return;
  // highlight the code when you run it
  if (!start) start = { line: editor.firstLine(), ch: 0 };
  if (!end) end = { line: editor.lastLine() + 1, ch: 0 };
  var marker = editor.markText(start, end, { className: "styled-background" });
  setTimeout(() => marker.clear(), 300);
}
