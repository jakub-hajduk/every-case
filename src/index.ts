import type { Package, CustomElement } from 'custom-elements-manifest/schema';
import cartesian from 'cartesian'
import {
  Attribute,
  Combination,
  CombinationsOptions,
  MappingFn,
  RenderFunction,
  RenderOptions,
  RenderVariables
} from './types'


// UTILS
const isObject = (a): a is object => Object.prototype.toString.call(a) === '[object Object]'
const isArray = <T = any>(a): a is Array<T> => Array.isArray(a)
const isString = (a): a is string => typeof a === 'string'
const isCustomElement = (a): a is CustomElement => a.customElement === true

const sortObject = (obj: object): object => {
  return Object.keys(obj).sort().reduce(function (result, key) {
    result[key] = obj[key];
    return result;
  }, {});
}

function findNode(tree, cb) {
  const ensureArray = (input) => {
    if (isObject(tree)) return Object.values(input).filter(i => isArray(i) || isObject(i))
    if (isArray(tree)) return input
  }

  for (const node of ensureArray(tree)) {
    if (cb(node)) return node
    let desiredNode = findNode(ensureArray(node), cb)
    if (desiredNode) return desiredNode
  }

  return false
}

// RENDERING FUNCTIONS
const attr = (attribute: Attribute) => {
  if (attribute.value === 'false') {
    return ''
  }

  if (attribute.value === 'true') {
    return ` ${attribute.name}`
  }

  return ` ${attribute.name}="${attribute.value}"`
}

const defaultTemplate = `<{{tag}}{{body}}</{{tag}}>`

const defaultRenderFn: RenderFunction = (template, variables) => {
  const templateRegex = new RegExp(`(\{\{(${Object.keys(variables).join('|')})\}\})`, 'gm')
  const output = template.replaceAll(templateRegex, (_a, _b, part) => variables[part])
  return output
}

const defaultRenderOptions: RenderOptions = {
  tag: 'b',
  template: defaultTemplate,
  renderFn: defaultRenderFn,
}

// MAIN FUNCTIONS

const extractTypeValues = (type) => {
  if( type === 'boolean' ) {
    return ['true', 'false'];
  }

  return type.replace(/[ "']/g, '').split('\|').sort()
}

const getAttributesAndValues = (componentData: CustomElement, pickAttributes?: string[], omitAttributes?: string[]) => {
  const attributeEntries = componentData.attributes
    .filter(attribute => !!pickAttributes ? pickAttributes.includes(attribute.name) : true)
    .filter(attribute => !!omitAttributes ? !omitAttributes.includes(attribute.name) : true)
    .map(attribute => [attribute.name, extractTypeValues(attribute.type.text)])
  return Object.fromEntries(attributeEntries);
}

const clearUndefined = (combination: object) => {
  Object.entries(combination).forEach(([key, value]) => {
    if( value === 'undefined' ) delete combination[key]
  })

  return combination;
}

const mapCombinations = (elementData: CustomElement, mappings: MappingFn = (k, v) => [k, v]) => {
  return (combination: Combination) => {
    const output = Object.entries(combination).map(([key, value]) => mappings(key, value, elementData) || [key, value])
    return Object.fromEntries(output)
  }
}

export const combinations = (manifest: Package, tagName: string, options?: CombinationsOptions ) => {
  const componentData = findNode(manifest, (node) => node?.tagName === tagName)
  const attributes = getAttributesAndValues(componentData, options?.pick || undefined, options?.omit || undefined);
  const sortedAttributes = sortObject(attributes);
  const allCombinations = cartesian(sortedAttributes);
  const clearCombinations = allCombinations.map(clearUndefined)
  return clearCombinations.map(mapCombinations(componentData, options?.mapFn || undefined))
}

export const attributes = (manifest: Package, tagName: string) => {
  const componentData = findNode(manifest, (node) => node?.tagName === tagName)
  if (componentData) {
    return componentData?.attributes.map(attribute => attribute.name)
  }
  console.error(`Couldn't find ${tagName} element.`)
}

export const tagNames = (manifest: Package) => {
  const out: CustomElement[] = [];

  manifest.modules.forEach((module) => {
    module.declarations.forEach((declaration) => {
      if( isCustomElement(declaration) ) {
        out.push(declaration)
      }
    })
  })

  return out.map(element => element.tagName);
}

export const render = (combination: Combination, options?: Partial<RenderOptions>) => {
  const finalOptions: RenderOptions = {...defaultRenderOptions, ...options}
  const definitions: RenderVariables = {
    tag: finalOptions.tag,
    attributes: Object.entries(combination).map(([name, value]) => ({name, value}))
  }
  if( options?.body ) {
    definitions.body = options.body
  }

  return finalOptions.renderFn(finalOptions.template, definitions)
}

export const renderAll = (combinations: Combination[], options?: Partial<RenderOptions>) => {
  return combinations.map(combination => render(combination, options)).join('\n')
}

export const everyCase = (manifest?: Package) => {

  return {
    combinations: (tagName: string, options?: CombinationsOptions) => {
      const innerCombinations = combinations(manifest, tagName, options);

      return {
        all: innerCombinations,
        render: (predicate, options?: Partial<RenderOptions>) => render(innerCombinations.find(predicate), {...options, tag: tagName}),
        renderAll: (options?: Partial<RenderOptions>) => renderAll(innerCombinations, {...options, tag: tagName})
      }
    },
    attributes: (tagName: string) => attributes(manifest, tagName),
    tagNames: () => tagNames(manifest)
  }
}

export default everyCase;
