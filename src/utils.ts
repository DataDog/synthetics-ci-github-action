/**
 * Returns a variables map from a list of strings, each of the form `VARIABLE_NAME=value`.
 */
export const parseVariableStrings = (
  keyValueStrings: string[] = [],
  logFunction: (log: string) => void
): {[variableName: string]: string} | undefined => {
  const variables: {[key: string]: string} = {}

  for (const keyValueString of keyValueStrings) {
    const separatorIndex = keyValueString.indexOf('=')

    if (separatorIndex === -1) {
      logFunction(`Ignoring variable "${keyValueString}" as separator "=" was not found`)
      continue
    }

    if (separatorIndex === 0) {
      logFunction(`Ignoring variable "${keyValueString}" as variable name is empty`)
      continue
    }

    const key = keyValueString.substring(0, separatorIndex)
    const value = keyValueString.substring(separatorIndex + 1)

    variables[key] = value
  }

  return Object.keys(variables).length > 0 ? variables : undefined
}

const SEPARATORS = {
  comma: ',',
  newline: '\n',
  'newline-or-comma': /,|\n/,
}

export const parseMultiple = (
  inputValue: string | undefined,
  {separator}: {separator: 'comma' | 'newline' | 'newline-or-comma'}
): string[] | undefined => {
  return inputValue?.split(SEPARATORS[separator]).map((datum: string) => datum.trim())
}
