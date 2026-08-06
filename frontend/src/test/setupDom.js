// ─── Setup de DOM (jsdom) para tests de componentes con node:test ─────
// IMPORTANTE: la creación del DOM ocurre a nivel de módulo (efecto
// secundario), ANTES de que se evalúe react-dom. Si react-dom se carga
// sin DOM (p. ej. con imports estáticos antes de llamar a setupDom()),
// desactiva el soporte nativo del evento 'input' (isInputEventSupported)
// y activa el polyfill legacy (attachEvent) que rompe focusin/onChange.
// Por eso los archivos de test DEBEN importar este módulo PRIMERO:
//   import '../test/setupDom';
import { JSDOM } from 'jsdom';
import { after } from 'node:test';

// En Node ≥21 `globalThis.navigator` es getter-only (no asignable):
// hay que redefinirlo con defineProperty.
function setGlobal(name, value) {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
});  setGlobal('window', dom.window);
  setGlobal('document', dom.window.document);
  setGlobal('navigator', dom.window.navigator);
  // El store (kanbanStore) lee localStorage al cargar el módulo
  setGlobal('localStorage', dom.window.localStorage);
  setGlobal('sessionStorage', dom.window.sessionStorage);
setGlobal('HTMLElement', dom.window.HTMLElement);
setGlobal('Element', dom.window.Element);
setGlobal('Node', dom.window.Node);
setGlobal('NodeList', dom.window.NodeList);
setGlobal('MutationObserver', dom.window.MutationObserver);
setGlobal('getComputedStyle', dom.window.getComputedStyle);
setGlobal('IS_REACT_ACT_ENVIRONMENT', true);

// jsdom mantiene vivo el event loop de Node mientras la ventana esté
// abierta: la cerramos al terminar los tests del archivo. NO cerrarla
// antes: destruiría el document y rompería el dispatch de eventos de RTL.
after(() => dom.window.close());

export default dom;
