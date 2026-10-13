(() => {
  const shortWords = 'а|без|в|во|для|до|за|и|из|или|к|как|ко|на|над|не|но|о|об|от|по|под|при|про|с|со|у|a|an|and|as|at|by|for|from|in|of|on|or|the|to|with';
  const pattern = new RegExp('(^|[\\s(«„“])(' + shortWords + ')[ \\t]+(?=\\S)', 'giu');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,textarea,code,pre,[contenteditable]')) return;
    node.nodeValue = node.nodeValue.replace(pattern, '$1$2\u00a0');
  });
})();
