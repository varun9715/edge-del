import {
  decorateBlock,
  decorateBlocks,
  decorateButtons,
  decorateIcons,
  decorateSections,
  loadBlock,
  loadSections,
} from './aem.js';
import { decorateRichtext } from './editor-support-rte.js';
import { decorateMain } from './scripts.js';

/**
 * Fetches metadata to check enabled feature flags.
 */
async function getFeatureFlags() {
  const metaTag = 'teaser';
  return metaTag;
}
/**
 * Filters out blocks based on feature flags
 */
async function filterBlocks(container) {
  const featureFlags = await getFeatureFlags();  // teaser

  container.querySelectorAll('[data-key="blocks_teaser"]').forEach(block => {
    console.log(`Removing teaser block: ${block.outerHTML}`);
    block.remove();
  });
}

setTimeout(() => {
  const button = document.querySelector('.ntVziG_spectrum-ActionButton[aria-label="Add"]');
  if (button) {
      console.log("Button found, triggering React event...");
      
      // Find the React internal event handler
      const reactEventKey = Object.keys(button).find(key => key.startsWith("__reactProps$"));
      if (reactEventKey && button[reactEventKey]?.onClick) {
          button[reactEventKey].onClick({ target: button, bubbles: true });
      } else {
          console.warn("React click handler not found, falling back to native event");
          button.click(); // Try native click if React event isn't found
      }
  } else {
      console.log("Button not found in DOM");
  }
}, 3000);



async function applyChanges(event) {
  const { detail } = event;
  const resource = detail?.request?.target?.resource 
    || detail?.request?.target?.container?.resource 
    || detail?.request?.to?.container?.resource;

  if (!resource) return false;

  const updates = detail?.response?.updates;
  if (!updates.length) return false;
  const { content } = updates[0];
  if (!content) return false;

  const parsedUpdate = new DOMParser().parseFromString(content, 'text/html');
  const element = document.querySelector(`[data-aue-resource="${resource}"]`);

  if (element) {
    if (element.matches('main')) {
      const newMain = parsedUpdate.querySelector(`[data-aue-resource="${resource}"]`);
      newMain.style.display = 'none';
      element.insertAdjacentElement('afterend', newMain);
      decorateMain(newMain);
      decorateRichtext(newMain);
      await loadSections(newMain);
      await filterBlocks(newMain); // Filter blocks based on feature flags
      element.remove();
      newMain.style.display = null;
      attachEventListners(newMain);
      return true;
    }

    const block = element.parentElement?.closest('.block[data-aue-resource]') || element?.closest('.block[data-aue-resource]');
    if (block) {
      const blockResource = block.getAttribute('data-aue-resource');
      const newBlock = parsedUpdate.querySelector(`[data-aue-resource="${blockResource}"]`);
      if (newBlock) {
        newBlock.style.display = 'none';
        block.insertAdjacentElement('afterend', newBlock);
        decorateButtons(newBlock);
        decorateIcons(newBlock);
        decorateBlock(newBlock);
        decorateRichtext(newBlock);
        await loadBlock(newBlock);
        await filterBlocks(newBlock); // Apply feature flag check on the new block
        block.remove();
        newBlock.style.display = null;
        return true;
      }
    } else {
      const newElements = parsedUpdate.querySelectorAll(`[data-aue-resource="${resource}"],[data-richtext-resource="${resource}"]`);
      if (newElements.length) {
        const { parentElement } = element;
        if (element.matches('.section')) {
          const [newSection] = newElements;
          newSection.style.display = 'none';
          element.insertAdjacentElement('afterend', newSection);
          decorateButtons(newSection);
          decorateIcons(newSection);
          decorateRichtext(newSection);
          decorateSections(parentElement);
          decorateBlocks(parentElement);
          await loadSections(parentElement);
          await filterBlocks(newSection); // Apply feature flag check on the section
          element.remove();
          newSection.style.display = null;
        } else {
          element.replaceWith(...newElements);
          decorateButtons(parentElement);
          decorateIcons(parentElement);
          decorateRichtext(parentElement);
          await filterBlocks(parentElement); // Apply feature flag check on the replaced elements
        }
        return true;
      }
    }
  }
  return false;
}

function attachEventListners(main) {
  [
    'aue:content-patch',
    'aue:content-update',
    'aue:content-add',
    'aue:content-move',
    'aue:content-remove',
    'aue:content-copy',
    'aue:ui-select payload'
  ].forEach((eventType) => main?.addEventListener(eventType, async (event) => {
    filterBlocks(document);
    event.stopPropagation();
    const applied = await applyChanges(event);
    if (!applied) window.location.reload();
  }));
}

attachEventListners(document.querySelector('main'));
