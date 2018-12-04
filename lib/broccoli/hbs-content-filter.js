'use strict';

const Filter = require('broccoli-filter');
const syntax = require('@glimmer/syntax');

module.exports = class HBSContentFilter extends Filter {
  constructor(input) {
    super(input);
    this.extensions = ['hbs'];
    this.targetExtension = 'template-contents';
  }

  processString(content) {
    let parents = new Map();
    let title = { level: Infinity, node: null, contents: null };
    let body = [];
    let keywords = [];
    syntax.traverse(syntax.preprocess(content), {
      Program(node) {
        addContentNodes(parents, node, node.body);
      },

      ElementNode(node) {
        if (isPulseHeadingNode(node)) {
          addPulseHeadingNode(keywords, node);
        } else {
          addContentNodes(parents, node, node.children);
        }
      },

      TextNode(node) {
        let parent = parents.get(node);
        if (!parent) { return; }

        body.push(node.chars);

        if (title.node === parent) {
          title.contents.push(node.chars);
        } else if (isHeading(parent) && headingLevel(parent) < title.level) {
          title = {
            level: headingLevel(parent),
            node: parent,
            contents: [node.chars]
          };
        }
      }
    });

    let output = {
      title: title.contents ? title.contents.join('') : null,
      body: body.join(''),
      keywords,
      rawTemplate: content
    };

    return JSON.stringify(output);
  }
}

function isHeading(node) {
  return node.type === 'ElementNode' && /^h\d$/.test(node.tag);
}

function headingLevel(node) {
  return Number(node.tag[1]);
}

function addContentNodes(parents, parent, candidates) {
  for (let candidate of candidates) {
    if (candidate.type === 'TextNode') {
      parents.set(candidate, parent);
    }
  }
}

function isPulseHeadingNode(node) {
  return (
    node.children.length &&
    node.children[0].path &&
    node.children[0].path.original === 'pulse-docs/heading'
  );
}

function addPulseHeadingNode(keywords, node) {
  let pulseHeadingProps = node.children[0].hash.pairs || [];
  let property = pulseHeadingProps.find(prop => prop.key === 'property');
  if (property) {
    keywords.push(property.value.value);
  }
}
