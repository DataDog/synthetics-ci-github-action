export const removeUndefinedValues = <T extends {[key: string]: any}>(
    object: T
  ): T => {
    const newObject = {...object}
    Object.keys(newObject).forEach(
      k => newObject[k] === undefined && delete newObject[k]
    )
  
    return newObject
  }