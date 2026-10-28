These are the original files saved immediately before the three-question concept unpacking change.

To restore that version from the project root in PowerShell:

```powershell
Copy-Item -LiteralPath 'backups\term-unpacking-before-three-questions\prompts.js' -Destination 'js\prompts.js'
Copy-Item -LiteralPath 'backups\term-unpacking-before-three-questions\unpack.js' -Destination 'js\unpack.js'
```

Restoring whole files also replaces any later edits to those files. If later edits exist, revert only the termFollowUp prompt and TERM_MAX concept limit instead.
