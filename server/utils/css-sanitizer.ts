import * as csstree from 'css-tree';

/**
 * CSS Sanitizer for School Branding
 * Prevents CSS injection attacks while allowing safe customization
 */

// Allowed CSS properties for school branding
const ALLOWED_PROPERTIES = new Set([
  // Colors
  'color', 'background-color', 'border-color',
  
  // Typography
  'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'text-decoration',
  
  // Layout (safe subset)
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-width', 'border-style', 'border-radius',
  
  // Safe visual properties
  'opacity', 'box-shadow', 'text-shadow',
  'background-image', 'background-repeat', 'background-position', 'background-size'
]);

// Dangerous CSS patterns to block
const DANGEROUS_PATTERNS = [
  /javascript:/i,
  /expression\s*\(/i,
  /@import/i,
  /behavior\s*:/i,
  /binding\s*:/i,
  /url\s*\(\s*["']?javascript:/i,
  /url\s*\(\s*["']?data:/i,
  /vbscript:/i,
  /mocha:/i,
  /livescript:/i,
];

// Allowed selectors - restrict to safe scoping
const ALLOWED_SELECTOR_PATTERNS = [
  /^\.school-\w+/, // .school-* classes
  /^#school-\w+/, // #school-* IDs
  /^\.musicdott-\w+/, // .musicdott-* classes
  /^body/, // body element
  /^html/, // html element
  /^\*/, // universal selector (with caution)
];

export interface CSSValidationResult {
  isValid: boolean;
  sanitizedCSS: string;
  errors: string[];
  warnings: string[];
}

/**
 * Sanitizes custom CSS to prevent injection attacks
 */
export function sanitizeCSS(css: string): CSSValidationResult {
  const result: CSSValidationResult = {
    isValid: false,
    sanitizedCSS: '',
    errors: [],
    warnings: []
  };

  if (!css || css.trim() === '') {
    result.isValid = true;
    result.sanitizedCSS = '';
    return result;
  }

  // Check for dangerous patterns first
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(css)) {
      result.errors.push(`Dangerous pattern detected: ${pattern.source}`);
      return result;
    }
  }

  try {
    // Parse CSS
    const ast = csstree.parse(css, {
      onParseError(error) {
        result.errors.push(`Parse error: ${error.message}`);
      }
    });

    if (result.errors.length > 0) {
      return result;
    }

    // Validate and sanitize
    const sanitizedRules: string[] = [];

    csstree.walk(ast, function(node) {
      if (node.type === 'Rule') {
        const rule = node as csstree.Rule;
        
        // Validate selectors
        const selectorText = csstree.generate(rule.prelude);
        const selectors = selectorText.split(',').map(s => s.trim());
        
        const validSelectors = selectors.filter(selector => {
          // Check if selector matches allowed patterns
          const isAllowed = ALLOWED_SELECTOR_PATTERNS.some(pattern => pattern.test(selector));
          if (!isAllowed) {
            result.warnings.push(`Selector not allowed: ${selector}`);
          }
          return isAllowed;
        });

        if (validSelectors.length === 0) {
          return; // Skip this rule
        }

        // Validate declarations
        const validDeclarations: string[] = [];
        
        if (rule.block && rule.block.type === 'Block') {
          csstree.walk(rule.block, function(declNode) {
            if (declNode.type === 'Declaration') {
              const declaration = declNode as csstree.Declaration;
              const property = declaration.property;
              const value = csstree.generate(declaration.value);

              // Check if property is allowed
              if (!ALLOWED_PROPERTIES.has(property)) {
                result.warnings.push(`Property not allowed: ${property}`);
                return;
              }

              // Additional value validation
              if (isDangerousValue(value)) {
                result.warnings.push(`Dangerous value detected: ${property}: ${value}`);
                return;
              }

              validDeclarations.push(`${property}: ${value}`);
            }
          });
        }

        if (validDeclarations.length > 0) {
          const sanitizedRule = `${validSelectors.join(', ')} { ${validDeclarations.join('; ')}; }`;
          sanitizedRules.push(sanitizedRule);
        }
      }
    });

    result.sanitizedCSS = sanitizedRules.join('\n');
    result.isValid = result.errors.length === 0;

  } catch (error) {
    result.errors.push(`CSS parsing failed: ${(error as Error).message}`);
  }

  return result;
}

/**
 * Checks if a CSS value contains dangerous content
 */
function isDangerousValue(value: string): boolean {
  // Check for dangerous patterns in values
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(value)) {
      return true;
    }
  }

  // Additional checks for specific dangerous values
  if (value.includes('document.') || value.includes('window.') || value.includes('eval(')) {
    return true;
  }

  return false;
}

/**
 * Scopes CSS to a specific school to prevent cross-tenant contamination
 */
export function scopeSchoolCSS(css: string, schoolId: number): string {
  if (!css || css.trim() === '') {
    return '';
  }

  const scopePrefix = `[data-school-id="${schoolId}"]`;
  
  try {
    const ast = csstree.parse(css);
    
    csstree.walk(ast, function(node) {
      if (node.type === 'Rule') {
        const rule = node as csstree.Rule;
        
        // Add school scope to each selector
        if (rule.prelude && rule.prelude.type === 'SelectorList') {
          const selectorList = rule.prelude as csstree.SelectorList;
          
          selectorList.children.forEach((selector) => {
            if (selector.type === 'Selector') {
              const selectorNode = selector as csstree.Selector;
              
              // Prepend scope to selector
              const scopeSelector = csstree.parse(`${scopePrefix} .placeholder`, {
                context: 'selector'
              }) as csstree.Selector;
              
              // Remove the placeholder part and prepend scope
              scopeSelector.children.pop(); // Remove placeholder
              
              // Prepend scope nodes to existing selector
              const originalChildren = [...selectorNode.children];
              selectorNode.children.clear();
              
              scopeSelector.children.forEach(child => {
                selectorNode.children.push(child);
              });
              
              originalChildren.forEach(child => {
                selectorNode.children.push(child);
              });
            }
          });
        }
      }
    });

    return csstree.generate(ast);
  } catch (error) {
    console.error('Failed to scope CSS:', error);
    return `/* Error scoping CSS: ${(error as Error).message} */`;
  }
}

/**
 * Validates color values for branding
 */
export function validateBrandingColor(color: string): boolean {
  // Hex color validation
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;
  if (hexPattern.test(color)) {
    return true;
  }

  // RGB/RGBA validation
  const rgbPattern = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/;
  if (rgbPattern.test(color)) {
    return true;
  }

  // HSL/HSLA validation
  const hslPattern = /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(?:,\s*[\d.]+\s*)?\)$/;
  if (hslPattern.test(color)) {
    return true;
  }

  return false;
}