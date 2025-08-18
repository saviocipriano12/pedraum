# ========== SCRIPT SSH GITHUB ==========
# Troque o e-mail abaixo pelo seu e-mail do GitHub
$githubEmail = "seu-email-no-github@gmail.com"

Write-Host "🔑 Gerando chave SSH..."
if (!(Test-Path "$env:USERPROFILE\.ssh\id_ed25519")) {
    ssh-keygen -t ed25519 -C $githubEmail -f "$env:USERPROFILE\.ssh\id_ed25519" -N ""
} else {
    Write-Host "⚠️ Já existe uma chave id_ed25519, não vou sobrescrever."
}

Write-Host "🚀 Iniciando e configurando ssh-agent..."
Set-Service ssh-agent -StartupType Automatic
Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519

Write-Host "📋 Copiando chave pública para área de transferência..."
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" | clip
Write-Host "✅ Cole essa chave no GitHub em: Settings → SSH and GPG Keys → New SSH key"

Write-Host "🛠️ Criando arquivo de configuração ~/.ssh/config"
@"
Host github.com
  HostName github.com
  User git
  IdentityFile $env:USERPROFILE/.ssh/id_ed25519
  AddKeysToAgent yes
  IdentitiesOnly yes
"@ | Out-File -FilePath "$env:USERPROFILE\.ssh\config" -Encoding ascii -Force

Write-Host "🔎 Testando conexão SSH..."
ssh -T git@github.com

Write-Host "🔗 Atualizando remoto para usar SSH..."
git remote set-url origin git@github.com:saviocipriano12/pedraum.git

Write-Host "📤 Fazendo push para o branch atual..."
git push -u origin HEAD
# ======================================
