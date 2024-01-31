import type { CustomElement } from 'custom-elements-manifest/schema'

// TYPES
export type MappingFn = (attributeName: string, value: any, elementData: CustomElement ) => [string, any];

export type Combination = () => { [k: string]: any }

export interface CombinationsOptions {
  pick?: string[];
  omit?: string[];
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
