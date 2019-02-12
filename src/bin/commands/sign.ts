import {Command, command, param, Options, option} from 'clime';

@command({
  description: 'sign a zip or tarball',
})
export default class extends Command {
  public async execute(
    @param({
        name: 'zip | tarball',
        description: 'path to zip or tarball',
        required: true,
    })
    path: string
  ){
    console.log('sign package not implemented yet')
  } 
}