export const removeUndefinedValues = <T extends {[key: string]: unknown}>(
  object: T
): T => {
  const newObject = {...object}
  for (const [key, value] of Object.entries(newObject)) {
    if (value === undefined) {
      delete newObject[key]
    }
  }

  return newObject
}
