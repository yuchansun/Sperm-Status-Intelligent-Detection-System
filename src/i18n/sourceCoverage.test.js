import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { translateText } from './translate.js'
import { MEASUREMENT_STANDARDS } from '../utils/measurementStandards.js'

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(file) : /\.(js|jsx)$/.test(file) && !file.includes('.test.') ? [file] : []
  })
}

it('translates Chinese source messages, including conditional labels, in interface and email builders', () => {
  const literals = []
  for (const file of sourceFiles(path.resolve('src'))) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.JS)
    function collect(node) {
      if (ts.isStringLiteral(node) && /\p{Script=Han}/u.test(node.text)) literals.push([file, node.text])
      // Do not collect fallback errors or other expressions used as data.
      if (ts.isConditionalExpression(node)) { collect(node.whenTrue); collect(node.whenFalse) }
    }
    function visit(node) {
      if (ts.isCallExpression(node) && ['tr', 'text'].includes(node.expression.getText(source)) && node.arguments[0]) collect(node.arguments[0])
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  for (const [file, text] of literals) for (const language of ['en', 'ko']) {
    expect(translateText(text, [], language), `${file}: ${text} (${language})`).not.toMatch(/\p{Script=Han}/u)
  }
})

it('localizes measurement labels and reference range wording without altering units', () => {
  for (const language of ['en', 'ko']) for (const item of MEASUREMENT_STANDARDS) {
    expect(translateText(item.label, [], language)).not.toMatch(/\p{Script=Han}/u)
    expect(translateText(item.range, [], language)).not.toMatch(/\p{Script=Han}/u)
  }
})
