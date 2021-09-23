import * as core from '@actions/core'
import { runTests } from './run-tests'


export async function run(): Promise<void> {

  try {
    const apiKey = core.getInput('apiKey');
    const appKey = core.getInput('appKey'); 
    const publicIds = core.getInput('publicIds').split(",");

    const context = {stdout: process.stdout, stderr: process.stderr} as any

    await runTests(apiKey,appKey,publicIds, context)
  
  } catch (error) {
    
  }
}

if (require.main === module){
  run()
}
