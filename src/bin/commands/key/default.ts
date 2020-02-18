import {SubcommandDefinition} from 'clime'

export const description = 'Generate and manage keys'

export const brief = 'key management'

export const subcommands: SubcommandDefinition[] = [
  {
    name: 'new',
    brief: 'Creates a new key for signing',
  },
  {
    name: 'list',
    brief: 'Lists available keys',
  },
];