import {SubcommandDefinition} from 'clime'

export const subcommands: SubcommandDefinition[] = [
  {
    name: 'key',
    brief: 'generate and manage keys',
  },
  {
    name: 'cert',
    brief: 'create certificates',
  },
  {
    name: 'pack',
    brief: 'create unsigned packages from dir',
  },
  {
    name: 'sign',
    brief: 'sign packages',
  },
  {
    name: 'verify',
    brief: 'verify packages',
  },
  {
    name: 'version',
    brief: 'print version number',
  },
];