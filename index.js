import fs from 'fs'
import path from 'path';
import ejs from 'ejs'
import parser from '@babel/parser'
import traverse from "@babel/traverse";
import { transformFromAst } from 'babel-core';


function createAsset(filePath) {

  // 1. 获取文件内容
  // 2. 获取依赖关系
  const source = fs.readFileSync(filePath, {
    encoding: 'utf-8'
  })

  const ast = parser.parse(source, {
    sourceType: 'module'
  })

  const deps = []
  traverse.default(ast, {
    ImportDeclaration({ node }) {
      deps.push(node.source.value)
    }
  })

  const { code } = transformFromAst(ast, null, {
    presets: ['env']
  })
  return {
    filePath,
    code,
    deps
  }
}

//构建图
function createGraph() {
  const mainAsset = createAsset('./example/main.js')

  const queue = [mainAsset]
  for (const asset of queue) {
    asset.deps.forEach(relativePath => {
      const child = createAsset(path.resolve('./example', relativePath))
      queue.push(child)
    });
  }

  return queue
}

const graph = createGraph()
// console.log(graph);


function build() {
  const template = fs.readFileSync('./bundle.ejs', { encoding: 'utf-8' })

  const data = graph.map((asset) => {
    return { 
      filePath: asset.filePath,
      code: asset.code
    }
  })
  console.log(data);
  const code = ejs.render(template, { data })

  fs.writeFileSync('./dist/bundle.js', code)
}


build(graph)