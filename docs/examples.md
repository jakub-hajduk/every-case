# Examples of everyCase usage

## Get attributes of specific element
```javascript
const everyCase = require('everyCase')
const ec = everyCase()

const attributes = ec.attributes('my-button')

// ['variant', 'size', 'href']
```

## Get all combinations for given element

```javascript
const everyCase = require('everyCase')
const ec = everyCase()

const combinations = ec.combinations('my-button').all

// [
//   { href: 'string', size: 'large', variant: 'default' },
//   { href: 'string', size: 'large', variant: 'ghost' },
//   { href: 'string', size: 'large', variant: 'primary' },
//   { href: 'string', size: 'medium', variant: 'default' },
//   { href: 'string', size: 'medium', variant: 'ghost' },
//   { href: 'string', size: 'medium', variant: 'primary' },
//   { href: 'string', size: 'small', variant: 'default' },
//   { href: 'string', size: 'small', variant: 'ghost' },
//   { href: 'string', size: 'small', variant: 'primary' },
//   { size: 'large', variant: 'default' },
//   { size: 'large', variant: 'ghost' },
//   { size: 'large', variant: 'primary' },
//   { size: 'medium', variant: 'default' },
//   { size: 'medium', variant: 'ghost' },
//   { size: 'medium', variant: 'primary' },
//   { size: 'small', variant: 'default' },
//   { size: 'small', variant: 'ghost' },
//   { size: 'small', variant: 'primary' }
// ]
```

## Get all combinations for given element with selected values
```javascript
const everyCase = require('everyCase')
const ec = everyCase()

const options = {
  pick: ['size', 'variant']
}

const combinations = ec.combinations('my-button', options).all;

// [
//   { size: 'large', variant: 'default' },
//   { size: 'large', variant: 'ghost' },
//   { size: 'large', variant: 'primary' },
//   { size: 'medium', variant: 'default' },
//   { size: 'medium', variant: 'ghost' },
//   { size: 'medium', variant: 'primary' },
//   { size: 'small', variant: 'default' },
//   { size: 'small', variant: 'ghost' },
//   { size: 'small', variant: 'primary' }
// ]
```

## Get combinations with mappedValues
```javascript
const everyCase = require('everyCase')
const ec = everyCase()

const options = {
  pick: ['href', 'variant'],
  mapFn: (name, value) => name === 'href' ? [name, 'http://google.com'] : [name, value]
}

const combinations = ec.combinations('my-button', options).all;

// [
//   { href: 'http://google.com', variant: 'default' },
//   { href: 'http://google.com', variant: 'ghost' },
//   { href: 'http://google.com', variant: 'primary' },
//   { variant: 'default' },
//   { variant: 'ghost' },
//   { variant: 'primary' }
// ]
```

## Get all rendered templates for all combinations
```javascript
const everyCase = require('everyCase')
const ec = everyCase()

const options = {
  pick: ['size', 'variant'],
}

const templates = ec.combinations('my-button', options).renderAll();

// <my-button size="large" variant="default"/>
// <my-button size="large" variant="ghost"/>
// <my-button size="large" variant="primary"/>
// <my-button size="medium" variant="default"/>
// <my-button size="medium" variant="ghost"/>
// <my-button size="medium" variant="primary"/>
// <my-button size="small" variant="default"/>
// <my-button size="small" variant="ghost"/>
// <my-button size="small" variant="primary"/>
```

## Get all rendered templates for all combination with custom element's body
```javascript
const everyCase = require('everyCase')
const ec = everyCase()

const options = {
  pick: ['size', 'variant'],
}

const renderOptions = {
  body: '<b>Strong button</b>'
}

const template = ec.combinations('my-button', options).renderAll(renderOptions);

// <my-button size="large" variant="default"><b>Strong button</b></my-button>
// <my-button size="large" variant="ghost"><b>Strong button</b></my-button>
// <my-button size="large" variant="primary"><b>Strong button</b></my-button>
// <my-button size="medium" variant="default"><b>Strong button</b></my-button>
// <my-button size="medium" variant="ghost"><b>Strong button</b></my-button>
// <my-button size="medium" variant="primary"><b>Strong button</b></my-button>
// <my-button size="small" variant="default"><b>Strong button</b></my-button>
// <my-button size="small" variant="ghost"><b>Strong button</b></my-button>
// <my-button size="small" variant="primary"><b>Strong button</b></my-button>
```

## Get all rendered templates for all combination with custom handlebars template
available fields:
- `tag` - string,
- `attributes` - collection of `{name: string, value: string}` objects
- `body` - string

```javascript
const everyCase = require('everyCase')
const ec = everyCase()

const options = {
  pick: ['size'],
}

const renderOptions = {
  template: `{{tag}} element can have{{#attributes}}{{{attr .}}}{{/attributes}} attribute`,
}

const template = ec.combinations('my-button', options).renderAll(renderOptions);

// my-button element can have size="large" attribute
// my-button element can have size="medium" attribute
// my-button element can have size="small" attribute
```


## Use other rendering engine for rendering usage cases
```javascript
const everyCase = require('everyCase')
const ec = everyCase()

const options = {
  pick: ['size'],
}

const renderOptions: RenderOptions = {
  template: 'Element %TAG% is 👌',
  renderFn: (template, variables) => template.replace(/%TAG%/g, variables.tag)
}

const template = ec.combinations('my-button', options).renderAll(renderOptions);

// Element my-button is 👌
// Element my-button is 👌
// Element my-button is 👌
```

## Get rendered template for specific combination
```javascript
const everyCase = require('everyCase')
const ec = everyCase()

const options = {
  pick: ['size', 'variant'],
}

const predicateFn = (combination) => combination.size === 'medium' && combination.variant === 'primary'

const template = ec.combinations('my-button', options).render(predicateFn);

// <my-button size="medium" variant="primary"/>
```

## Get rendered template for specific combination
```javascript
const everyCase = require('everyCase')
const ec = everyCase()

const options = {
  pick: ['size'],
}

const renderOptions: RenderOptions = {
  renderFn: (template, variables) => `Element ${variables.tag} has ${variables.attributes.map(variable => variable.name).join(', ')} attributes`
}

const predicateFn = (combination) => combination.size === 'medium'

const template = ec.combinations('my-button', options).render(predicateFn, renderOptions);

// Element my-button has size attributes
```
