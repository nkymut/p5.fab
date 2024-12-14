var errorState = {};

errorState = new Proxy(
  { message: "" },
  {
    set(target, prop, val) {
      target[prop] = val;
      errorConsole = window.document.getElementById("error-log");
      val == "" ? (errorConsole.style.display = "none") : (errorConsole.style.display = "block");
      errorConsole.innerHTML = val;
    },
  },
);

function evaluateJs(code) {
  // there must be a better way to do this...
  // can't handle code errors which happen in p5 loops (draw, etc) through try/catch-ing the eval()
  // instead, inject try/catch loops here by iterating through the ast
  // Add validation for empty or invalid code
  if (!code || typeof code !== 'string' || code.trim() === '') {
    console.warn('Empty or invalid code provided to evaluateJs');
    return;
  }
  
  try {
    var ast = acorn.parse(code, { ecmaVersion: 2020 });
    var codeToEval = "";
    errorState.message = "";

    // Validate AST structure
    if (!ast.body || !Array.isArray(ast.body)) {
      console.warn('Invalid AST structure');
      return;
    }

    for (const n in ast.body) {
      // Validate node exists and has required properties
      if (!ast.body[n] || typeof ast.body[n].start === 'undefined' || typeof ast.body[n].end === 'undefined') {
        console.warn(`Invalid node at index ${n}`);
        continue;
      }

      var nodeBody = code.slice(ast.body[n].start, ast.body[n].end);

      if (ast.body[n].type == "FunctionDeclaration") {
        // Validate function node structure
        if (!ast.body[n].body || typeof ast.body[n].body.start === 'undefined') {
          console.warn(`Invalid function declaration at index ${n}`);
          continue;
        }

        functionDeclaration = code.slice(
          ast.body[n].start, 
          ast.body[n].body.start + 1
        );
        
        functionBody = code.slice(
          ast.body[n].body.start + 1, 
          ast.body[n].end - 1
        );

        nodeBody =
          functionDeclaration +
          "\ntry {\n" +
          functionBody +
          "\n}\ncatch (e){\nwindow.parent.errorState.message=e.message;\n}\n}\n";
      }
      codeToEval += nodeBody;
    }

    // Validate preview iframe exists
    const preview = document.getElementById("preview");
    if (!preview || !preview.contentWindow) {
      console.error("Preview iframe not found");
      return;
    }

    preview.contentWindow.eval(codeToEval);
  } catch (e) {
    console.log(e.message);
    errorState.message = e.message;
  }
}
