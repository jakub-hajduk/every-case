import glob from 'tiny-glob/sync'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Package, CustomElement } from 'custom-elements-manifest/schema';
import cartesian from 'cartesian'
import { sync as closest } from 'closest-package'
import Handlebars from 'handlebars'

// TYPES
export type MappingFn = (attributeName: string, value: any, elementData: CustomElement ) => [string, any];

export type Combination = () => { [k: string]: any }

export interface CombinationsOptions {
  pick?: string[];
  mapFn?: MappingFn;
}

export interface Attribute {
  name: string;
  value: string;
}

export interface RenderVariables {
  tag: string;
  attributes: Attribute[];
  body?: string;
}

export type RenderFunction = (template: string, variables: { [k: string]: any }) => string

export interface RenderOptions extends CombinationsOptions {
  tag: string;
  body?: string;
  template: string;
  renderFn: RenderFunction;
}

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

Handlebars.registerHelper('attr', attr)

const defaultTemplate = `<{{tag}}{{#attributes}}{{attr .}}{{/attributes}}{{#unless body}}/{{/unless}}>{{#if body}}{{body}}</{{tag}}>{{/if}}`

const defaultRenderFn: RenderFunction = (template, variables) => {
  const handlebarsTemplate = Handlebars.compile(template, {noEscape: true})
  return handlebarsTemplate(variables);
}

const defaultRenderOptions: RenderOptions = {
  tag: 'b',
  template: defaultTemplate,
  renderFn: defaultRenderFn,
}

// MAIN FUNCTIONS
const resolveManifestFilePath = (filePath?: string) => {

  if( filePath ) {
    return resolve(process.cwd(), filePath);
  }

  const packageJsonFilePath = closest(process.cwd(), json => json?.customElements)
  if(packageJsonFilePath) {
    return resolve(process.cwd(), packageJsonFilePath);
  }

  const manifestFilesFound = glob('**/custom-elements.json', {cwd: process.cwd()});
  if( manifestFilesFound.length > 0 ) {
    return  manifestFilesFound[0]
  }

  console.error(`Couldn't resolve custom-elements.json file.`)
  return false;
}

const getManifestContents = (manifestFilePath?: string): Package => {
  const manifestFile = resolveManifestFilePath(manifestFilePath);

  if (manifestFile) {
    const manifestFileContents = readFileSync(resolve(process.cwd(), manifestFile), {encoding: 'utf-8'})
    return JSON.parse(manifestFileContents)
  }

  console.error('There was an error reading custom-elements.json file.')
}

const extractTypeValues = (type) => {
  if( type === 'boolean' ) {
    return ['true', 'false'];
  }

  return type.replace(/[ "']/g, '').split('\|').sort()
}

const getAttributesAndValues = (componentData: CustomElement, pickAttributes?: string[]) => {
  const attributeEntries = componentData.attributes
    .filter(attribute => !!pickAttributes ? pickAttributes.includes(attribute.name) : true)
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
  const attributes = getAttributesAndValues(componentData, options?.pick || undefined);
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

export const everyCase = (manifestOrPath?: string | Package) => {
  const manifest = isString(manifestOrPath) || !manifestOrPath ? getManifestContents(manifestOrPath as string) : manifestOrPath;

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
