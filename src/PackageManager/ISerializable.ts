export interface SerializationInfo {
  data: any; // this field stores the info obtained from calling getObjectData on a to be serialized object
  ctor: string; // name of the constructor of the serialized object
  ts: number; // timestamp when object was serialized
}

export interface ISerializable {
  getObjectData(): Promise<any>;
  // there is no way to declare a constructor or static method in typescript interfaces
  // https://stackoverflow.com/questions/46969551/constructor-in-typescript-interface
  // static getConstructor() : Promise<(info: SerializationInfo) => T>;
}