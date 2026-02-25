export const IPC_CHANNELS = {
  GET_INITIAL_STATE: 'get-initial-state',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
