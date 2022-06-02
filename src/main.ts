import glob from 'tiny-glob/sync'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { Package, CustomElement } from 'custom-elements-manifest/schema';
import cartesian from 'cartesian'
import { sync as closest } from 'closest-package'

// TYPES
type MappingFn = (attributeName: string, value: any, elementData: CustomElement ) => [string, any];
type Combination = () => { [k: string]: any }
interface CombinationOptions {
  pick?: string[];
  mapFn?: MappingFn;
}

// UTILS
const isObject = (a): a is object => Object.prototype.toString.call(a) === '[object Object]'
const isArray = <T = any>(a): a is Array<T> => Array.isArray(a)
const isString = (a): a is string => typeof a === 'string'

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



// MAIN FUNCTIONS
const resolveManifestFilePath = (filePath?: string) => {
  let manifestFilePath;

  if( filePath && existsSync(resolve(process.cwd(), filePath)) ) {
    manifestFilePath = resolve(process.cwd(), filePath);
  }

  const packageJsonFilePath = closest(process.cwd(), json => json?.customElements)
  if(packageJsonFilePath) {
    manifestFilePath = resolve(process.cwd(), packageJsonFilePath);
  }

  const manifestFilesFound = glob('**/custom-elements.json', {cwd: process.cwd()});
  if( manifestFilesFound.length > 0 ) {
    manifestFilePath = manifestFilesFound[0]
  }

  if( manifestFilePath ){
    return manifestFilePath
  }

  console.error(`Couldn't resolve custom-elements.json file.`)
  return false;
}

const getManifestContents = (manifestFilePath?: string): Package => {
  const manifestFile = resolveManifestFilePath(manifestFilePath);

  try {
    const manifestFileContents = readFileSync(resolve(process.cwd(), manifestFile), {encoding: 'utf-8'})
    return JSON.parse(manifestFileContents)
  } catch (error) {
    console.error('There was an error reading custom-elements.json file.', error)
  }
}

const extractTypeValue = (type) => {
  if( type === 'boolean' ) {
    return ['true', 'false'];
  }

  return type.replace(/[ "']/g, '').split('\|').sort()
}

const getAttributesAndValues = (componentData: CustomElement, pickAttributes?: string[]) => {
  const attributeEntries = componentData.attributes
    .filter(attribute => !!pickAttributes ? pickAttributes.includes(attribute.name) : true)
    .map(attribute => [attribute.name, extractTypeValue(attribute.type.text)])
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

export const combinations = (manifest: Package, tagName: string, options?: CombinationOptions ) => {
  const componentData = findNode(manifest, (node) => node?.tagName === tagName)
  const attributes = getAttributesAndValues(componentData, options?.pick || undefined);
  const sortedAttributes = sortObject(attributes);
  const allCombinations = cartesian(sortedAttributes);
  const clearCombinations = allCombinations.map(clearUndefined)
  return clearCombinations.map(mapCombinations(componentData, options?.mapFn || undefined))
}

export default function (manifestOrPath?: string | Package) {
  const manifest = isString(manifestOrPath) || !manifestOrPath ? getManifestContents(manifestOrPath as string) : manifestOrPath;

  return {
    combinations: (tagName: string, options?: CombinationOptions) => combinations(manifest, tagName, options)
  }
}

// sl-avatar - element with string

;(() => {
  const manifest = getManifestContents();
  const g = combinations(manifest, 'sl-tag', {pick: ['variant', 'removable', 'size']})
  console.log( g )
})()
