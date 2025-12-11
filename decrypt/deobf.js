/**
 * TikTok webmssdk.js Deobfuscator
 * 
 * Transforms obfuscated code into readable JavaScript using Babel AST manipulation.
 * 
 * Usage:
 *   1. Place webmssdk.js in this directory
 *   2. Run: node deobf.js
 *   3. Output written to output.js
 */

const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

// Configuration
const INPUT_FILE = './webmssdk.js';
const OUTPUT_FILE = './output.js';
const NUM_PASSES = 5;  // Multiple passes for nested expressions

console.log('[*] TikTok webmssdk.js Deobfuscator');
console.log('[*] Reading input file...');

if (!fs.existsSync(INPUT_FILE)) {
    console.error(`[!] Error: ${INPUT_FILE} not found`);
    console.error('[!] Download webmssdk.js from TikTok and place it in this directory');
    process.exit(1);
}

const code = fs.readFileSync(INPUT_FILE, 'utf-8');
console.log(`[*] Input size: ${(code.length / 1024 / 1024).toFixed(2)} MB`);

console.log('[*] Parsing AST...');
const ast = parser.parse(code, {
    sourceType: 'script',
    allowReturnOutsideFunction: true,
    errorRecovery: true,
});

/**
 * Transform 1: Boolean Literals
 * !0 -> true
 * !1 -> false
 */
function transformBooleans(ast) {
    let count = 0;
    traverse(ast, {
        UnaryExpression(path) {
            const { operator, argument } = path.node;
            
            if (operator === '!' && t.isNumericLiteral(argument)) {
                if (argument.value === 0) {
                    path.replaceWith(t.booleanLiteral(true));
                    count++;
                } else if (argument.value === 1) {
                    path.replaceWith(t.booleanLiteral(false));
                    count++;
                }
            }
        },
    });
    return count;
}

/**
 * Transform 2: Undefined
 * void 0 -> undefined
 */
function transformUndefined(ast) {
    let count = 0;
    traverse(ast, {
        UnaryExpression(path) {
            const { operator, argument } = path.node;
            
            if (operator === 'void' && t.isNumericLiteral(argument) && argument.value === 0) {
                path.replaceWith(t.identifier('undefined'));
                count++;
            }
        },
    });
    return count;
}

/**
 * Transform 3: Hex Numbers
 * 0x15e -> 350
 */
function transformHexNumbers(ast) {
    let count = 0;
    traverse(ast, {
        NumericLiteral(path) {
            if (path.node.extra && path.node.extra.raw && path.node.extra.raw.startsWith('0x')) {
                delete path.node.extra;
                count++;
            }
        },
    });
    return count;
}

/**
 * Transform 4: Constant Folding
 * 5 * 10 + 2 -> 52
 * "hel" + "lo" -> "hello"
 */
function transformConstantFolding(ast) {
    let count = 0;
    traverse(ast, {
        BinaryExpression(path) {
            const { left, right, operator } = path.node;
            
            // Only fold if both sides are literals
            if (!t.isLiteral(left) || !t.isLiteral(right)) return;
            
            // Skip if either is a regex
            if (t.isRegExpLiteral(left) || t.isRegExpLiteral(right)) return;
            
            const leftVal = left.value;
            const rightVal = right.value;
            
            let result;
            try {
                switch (operator) {
                    case '+': result = leftVal + rightVal; break;
                    case '-': result = leftVal - rightVal; break;
                    case '*': result = leftVal * rightVal; break;
                    case '/': result = leftVal / rightVal; break;
                    case '%': result = leftVal % rightVal; break;
                    case '|': result = leftVal | rightVal; break;
                    case '&': result = leftVal & rightVal; break;
                    case '^': result = leftVal ^ rightVal; break;
                    case '<<': result = leftVal << rightVal; break;
                    case '>>': result = leftVal >> rightVal; break;
                    case '>>>': result = leftVal >>> rightVal; break;
                    default: return;
                }
                
                if (typeof result === 'number' && !isFinite(result)) return;
                
                path.replaceWith(t.valueToNode(result));
                count++;
            } catch (e) {
                // Skip if evaluation fails
            }
        },
    });
    return count;
}

/**
 * Transform 5: Computed Properties to Dot Notation
 * obj["property"] -> obj.property
 */
function transformComputedProperties(ast) {
    let count = 0;
    
    // Reserved words that can't be used with dot notation
    const reserved = new Set([
        'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
        'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
        'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
        'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
        'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
        'protected', 'public', 'static', 'yield'
    ]);
    
    traverse(ast, {
        MemberExpression(path) {
            const { property, computed } = path.node;
            
            if (!computed || !t.isStringLiteral(property)) return;
            
            const propName = property.value;
            
            // Check if valid identifier
            if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propName)) return;
            
            // Check if reserved word
            if (reserved.has(propName)) return;
            
            path.node.property = t.identifier(propName);
            path.node.computed = false;
            count++;
        },
    });
    return count;
}

/**
 * Transform 6: Simplify Logical Expressions
 * true && x -> x
 * false || x -> x
 */
function transformLogicalExpressions(ast) {
    let count = 0;
    traverse(ast, {
        LogicalExpression(path) {
            const { left, right, operator } = path.node;
            
            if (t.isBooleanLiteral(left)) {
                if (operator === '&&') {
                    // true && x -> x, false && x -> false
                    path.replaceWith(left.value ? right : left);
                    count++;
                } else if (operator === '||') {
                    // true || x -> true, false || x -> x
                    path.replaceWith(left.value ? left : right);
                    count++;
                }
            }
        },
    });
    return count;
}

/**
 * Transform 7: Remove Dead Code
 * if (false) { ... } -> remove
 * if (true) { ... } -> keep body only
 */
function transformDeadCode(ast) {
    let count = 0;
    traverse(ast, {
        IfStatement(path) {
            const test = path.node.test;
            
            if (t.isBooleanLiteral(test)) {
                if (test.value === true) {
                    // Replace with consequent
                    if (t.isBlockStatement(path.node.consequent)) {
                        path.replaceWithMultiple(path.node.consequent.body);
                    } else {
                        path.replaceWith(path.node.consequent);
                    }
                    count++;
                } else if (test.value === false) {
                    // Replace with alternate or remove
                    if (path.node.alternate) {
                        if (t.isBlockStatement(path.node.alternate)) {
                            path.replaceWithMultiple(path.node.alternate.body);
                        } else {
                            path.replaceWith(path.node.alternate);
                        }
                    } else {
                        path.remove();
                    }
                    count++;
                }
            }
        },
        
        // Remove while(false) loops
        WhileStatement(path) {
            if (t.isBooleanLiteral(path.node.test) && path.node.test.value === false) {
                path.remove();
                count++;
            }
        },
    });
    return count;
}

// Run all transforms multiple times
console.log('[*] Running transforms...');

for (let pass = 1; pass <= NUM_PASSES; pass++) {
    console.log(`\n[*] Pass ${pass}/${NUM_PASSES}`);
    
    let totalChanges = 0;
    
    let changes = transformBooleans(ast);
    if (changes > 0) console.log(`    Booleans: ${changes}`);
    totalChanges += changes;
    
    changes = transformUndefined(ast);
    if (changes > 0) console.log(`    Undefined: ${changes}`);
    totalChanges += changes;
    
    changes = transformHexNumbers(ast);
    if (changes > 0) console.log(`    Hex numbers: ${changes}`);
    totalChanges += changes;
    
    changes = transformConstantFolding(ast);
    if (changes > 0) console.log(`    Constant folding: ${changes}`);
    totalChanges += changes;
    
    changes = transformComputedProperties(ast);
    if (changes > 0) console.log(`    Computed properties: ${changes}`);
    totalChanges += changes;
    
    changes = transformLogicalExpressions(ast);
    if (changes > 0) console.log(`    Logical expressions: ${changes}`);
    totalChanges += changes;
    
    changes = transformDeadCode(ast);
    if (changes > 0) console.log(`    Dead code: ${changes}`);
    totalChanges += changes;
    
    if (totalChanges === 0) {
        console.log('    No more changes, stopping early');
        break;
    }
}

// Generate output
console.log('\n[*] Generating output...');
const output = generate(ast, {
    comments: false,
    compact: false,
    jsescapeOption: { minimal: true },
});

fs.writeFileSync(OUTPUT_FILE, output.code);
console.log(`[*] Output written to ${OUTPUT_FILE}`);
console.log(`[*] Output size: ${(output.code.length / 1024 / 1024).toFixed(2)} MB`);
console.log('[*] Done!');
