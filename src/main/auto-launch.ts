import AutoLaunch from 'auto-launch'

const autoLauncher = new AutoLaunch({
  name: 'CodeBurn Monitor',
  isHidden: true,
})

export async function setupAutoLaunch(enabled: boolean): Promise<void> {
  try {
    const isEnabled = await autoLauncher.isEnabled()
    if (enabled && !isEnabled) {
      await autoLauncher.enable()
    } else if (!enabled && isEnabled) {
      await autoLauncher.disable()
    }
  } catch (error) {
    console.error('Auto-launch setup failed:', error)
  }
}
