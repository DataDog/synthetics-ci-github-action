import {RunTestCommand} from '@datadog/datadog-ci/dist/commands/synthetics/run-test'
import {BaseContext} from 'clipanion/lib/advanced' 


export async function runTests(apiKey: string, appKey: string, publicIds: string[], context: any): Promise<BaseContext> {
   try{    
        const command = new RunTestCommand();
        command.context = context
        command['apiKey'] = apiKey;
        command['appKey'] = appKey;
        command['publicIds'] = publicIds
        await command.execute();
        
   }catch(error){
        
   }
   return context

}
