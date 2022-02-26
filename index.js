import fs from 'fs'
import path from 'path';
import ejs from 'ejs'
import parser from '@babel/parser'
import traverse from "@babel/traverse";
import { transformFromAst } from 'babel-core';
let id = 0
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
  // traverse解析获取依赖模块的路径地址 然后存入到deps中
  traverse.default(ast, {
    ImportDeclaration({ node }) {
      console.log('node', node);
      deps.push(node.source.value)
    }
  })
  // 将esmodule 转换成 commomjs
  const { code } = transformFromAst(ast, null, {
    presets: ['env']
  })
  return {
    filePath,
    code,
    deps,
    mapping: {}, // 存储当前模块的依赖模块的id
    id: id++ // 每个模块都有一个唯一的id
  }
}

//构建图
function createGraph() {
  // 获取入口文件的文件内容 以及 依赖关系图
  const mainAsset = createAsset('./example/main.js')
  // 将各个文件对应的依赖关系 收集起来
  const queue = [mainAsset]
  for (const asset of queue) {
    asset.deps.forEach(relativePath => {
      // 遍历解析依赖的模块
      const child = createAsset(path.resolve('./example', relativePath))
      // 将当前依赖的模块的唯一id存储起来
      asset.mapping[relativePath] = child.id
      queue.push(child)
    });
  }

  return queue
}

const graph = createGraph()
// console.log(graph);


function build() {
  // 读取ejs模板文件  生成模板
  const template = fs.readFileSync('./bundle.ejs', { encoding: 'utf-8' })
  
  const data = graph.map((asset) => {
    const {id, code, mapping} = asset
    return { 
      id,
      code,
      mapping
    }
  })
  console.log(data);
  const code = ejs.render(template, { data })

  fs.writeFileSync('./dist/bundle.js', code)
}


build(graph)