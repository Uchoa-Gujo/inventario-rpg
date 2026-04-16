import { supabase } from './supabase.js'

/* =========================================================
   ELEMENTOS
========================================================= */

const authScreen = document.getElementById('authScreen')
const appScreen = document.getElementById('appScreen')
const authMessage = document.getElementById('authMessage')

const showLoginTab = document.getElementById('showLoginTab')
const showRegisterTab = document.getElementById('showRegisterTab')

const loginFormBox = document.getElementById('loginFormBox')
const registerFormBox = document.getElementById('registerFormBox')

const loginUsuarioInput = document.getElementById('loginUsuario')
const loginSenhaInput = document.getElementById('loginSenha')
const loginBtn = document.getElementById('loginBtn')

const registerUsuarioInput = document.getElementById('registerUsuario')
const registerConfirmarUsuarioInput = document.getElementById('registerConfirmarUsuario')
const registerSenhaInput = document.getElementById('registerSenha')
const registerConfirmarSenhaInput = document.getElementById('registerConfirmarSenha')
const registerFraseInput = document.getElementById('registerFrase')
const registerConfirmacaoInput = document.getElementById('registerConfirmacao')
const registerBtn = document.getElementById('registerBtn')
const backToLoginBtn = document.getElementById('backToLoginBtn')

const logoutBtn = document.getElementById('logoutBtn')
const loggedUserText = document.getElementById('loggedUserText')
const saveStatus = document.getElementById('saveStatus')

const characterNameInput = document.getElementById('characterName')
const characterClassInput = document.getElementById('characterClass')
const characterLevelInput = document.getElementById('characterLevel')
const strengthInput = document.getElementById('strengthInput')
const notesInput = document.getElementById('notesInput')

const itemNameInput = document.getElementById('itemNameInput')
const addItemBtn = document.getElementById('addItemBtn')
const itemsList = document.getElementById('itemsList')

const togglePasswordButtons = document.querySelectorAll('.toggle-password')

/* =========================================================
   ESTADO
========================================================= */

let items = []
let autoSaveTimer = null
let ultimoEstadoSalvo = null

const AUTO_SAVE_DELAY = 1200

/* =========================================================
   UTIL
========================================================= */

function normalizarUsuario(usuario) {
  return String(usuario || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function gerarEmailInterno(usuario) {
  return `${normalizarUsuario(usuario)}@inventario.local`
}

function mostrarMensagem(msg, isError = true) {
  authMessage.textContent = msg
  authMessage.classList.remove('error', 'success')
  authMessage.classList.add(isError ? 'error' : 'success')
}

function limparMensagem() {
  authMessage.textContent = ''
  authMessage.classList.remove('error', 'success')
}

function setLoading(button, loading, normalText) {
  button.disabled = loading
  button.textContent = loading ? 'Aguarde...' : normalText
}

function setSaveStatus(texto) {
  if (saveStatus) {
    saveStatus.textContent = texto
  }
}

function traduzirErro(error) {
  const msg = error?.message || ''

  if (msg.includes('Invalid login credentials')) {
    return 'Usuário ou senha incorretos.'
  }

  if (msg.includes('User already registered')) {
    return 'Esse usuário já está cadastrado.'
  }

  if (msg.includes('Password should be at least 6 characters')) {
    return 'A senha precisa ter pelo menos 6 caracteres.'
  }

  if (msg.includes('Email rate limit exceeded')) {
    return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
  }

  return msg || 'Ocorreu um erro.'
}

function mostrarLoginTela() {
  loginFormBox.classList.remove('hidden')
  registerFormBox.classList.add('hidden')

  showLoginTab.classList.add('active')
  showRegisterTab.classList.remove('active')

  limparMensagem()
}

function mostrarCadastroTela() {
  registerFormBox.classList.remove('hidden')
  loginFormBox.classList.add('hidden')

  showRegisterTab.classList.add('active')
  showLoginTab.classList.remove('active')

  limparMensagem()
}

function abrirApp(usuarioVisual = '') {
  authScreen.classList.add('hidden')
  appScreen.classList.remove('hidden')
  loggedUserText.textContent = `Usuário: ${usuarioVisual}`
}

function abrirAuth() {
  appScreen.classList.add('hidden')
  authScreen.classList.remove('hidden')
}

function alternarSenha(targetId) {
  const input = document.getElementById(targetId)
  if (!input) return
  input.type = input.type === 'password' ? 'text' : 'password'
}

function criarId() {
  return crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

/* =========================================================
   SUPABASE AUTH
========================================================= */

async function cadastrarUsuario(usuario, senha) {
  const email = gerarEmailInterno(usuario)

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha
  })

  if (error) throw error
  return data
}

async function loginUsuario(usuario, senha) {
  const email = gerarEmailInterno(usuario)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  })

  if (error) throw error
  return data
}

async function logoutUsuario() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

async function pegarUsuarioLogado() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

/* =========================================================
   INVENTÁRIO / ESTADO
========================================================= */

function coletarEstadoInventario() {
  return {
    characterName: characterNameInput.value.trim(),
    characterClass: characterClassInput.value.trim(),
    characterLevel: characterLevelInput.value.trim(),
    strength: strengthInput.value.trim(),
    notes: notesInput.value,
    items: structuredClone(items)
  }
}

function aplicarEstadoInventario(dados) {
  if (!dados) return

  characterNameInput.value = dados.characterName || ''
  characterClassInput.value = dados.characterClass || ''
  characterLevelInput.value = dados.characterLevel || ''
  strengthInput.value = dados.strength || ''
  notesInput.value = dados.notes || ''
  items = Array.isArray(dados.items) ? structuredClone(dados.items) : []

  renderItems()
}

function renderItems() {
  itemsList.innerHTML = ''

  if (!items.length) {
    itemsList.innerHTML = '<p style="color:#98a8c3; margin:0;">Nenhum item adicionado.</p>'
    return
  }

  items.forEach(item => {
    const card = document.createElement('div')
    card.className = 'item-card'

    const name = document.createElement('span')
    name.textContent = item.name

    const actions = document.createElement('div')
    actions.className = 'item-card-actions'

    const renameBtn = document.createElement('button')
    renameBtn.className = 'icon-btn'
    renameBtn.type = 'button'
    renameBtn.textContent = 'Editar'
    renameBtn.addEventListener('click', () => editarItem(item.id))

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'icon-btn delete'
    deleteBtn.type = 'button'
    deleteBtn.textContent = 'Excluir'
    deleteBtn.addEventListener('click', () => removerItem(item.id))

    actions.appendChild(renameBtn)
    actions.appendChild(deleteBtn)

    card.appendChild(name)
    card.appendChild(actions)

    itemsList.appendChild(card)
  })
}

function adicionarItem() {
  const nome = itemNameInput.value.trim()
  if (!nome) return

  items.push({
    id: criarId(),
    name: nome
  })

  itemNameInput.value = ''
  renderItems()
  agendarAutoSave()
}

function editarItem(itemId) {
  const item = items.find(i => i.id === itemId)
  if (!item) return

  const novoNome = prompt('Novo nome do item:', item.name)
  if (novoNome === null) return

  const nomeLimpo = novoNome.trim()
  if (!nomeLimpo) return

  item.name = nomeLimpo
  renderItems()
  agendarAutoSave()
}

function removerItem(itemId) {
  items = items.filter(i => i.id !== itemId)
  renderItems()
  agendarAutoSave()
}

/* =========================================================
   BANCO
========================================================= */

async function salvarInventarioNoBanco() {
  const user = await pegarUsuarioLogado()
  if (!user) return

  const estado = coletarEstadoInventario()

  const { data: existente, error: erroBusca } = await supabase
    .from('inventarios')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (erroBusca) {
    console.error('Erro ao buscar inventário:', erroBusca)
    setSaveStatus('Erro ao salvar')
    return
  }

  if (existente) {
    const { error } = await supabase
      .from('inventarios')
      .update({
        dados: estado,
        atualizado_em: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (error) {
      console.error('Erro ao atualizar inventário:', error)
      setSaveStatus('Erro ao salvar')
      return
    }
  } else {
    const { error } = await supabase
      .from('inventarios')
      .insert({
        user_id: user.id,
        dados: estado
      })

    if (error) {
      console.error('Erro ao criar inventário:', error)
      setSaveStatus('Erro ao salvar')
      return
    }
  }

  ultimoEstadoSalvo = structuredClone(estado)
  setSaveStatus('Tudo salvo')
}

async function carregarInventarioDoBanco() {
  const user = await pegarUsuarioLogado()
  if (!user) return null

  const { data, error } = await supabase
    .from('inventarios')
    .select('dados')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Erro ao carregar inventário:', error)
    return null
  }

  return data ? data.dados : null
}

async function salvarSeMudou() {
  const estadoAtual = coletarEstadoInventario()

  const atual = JSON.stringify(estadoAtual)
  const ultimo = JSON.stringify(ultimoEstadoSalvo)

  if (atual === ultimo) {
    setSaveStatus('Tudo salvo')
    return
  }

  setSaveStatus('Salvando...')
  await salvarInventarioNoBanco()
}

function agendarAutoSave() {
  clearTimeout(autoSaveTimer)
  setSaveStatus('Alterações pendentes...')

  autoSaveTimer = setTimeout(async () => {
    await salvarSeMudou()
  }, AUTO_SAVE_DELAY)
}

/* =========================================================
   FLUXO
========================================================= */

async function entrarNoPersonagem(usuarioVisual) {
  abrirApp(usuarioVisual)

  const dadosSalvos = await carregarInventarioDoBanco()

  if (dadosSalvos) {
    aplicarEstadoInventario(dadosSalvos)
    ultimoEstadoSalvo = structuredClone(dadosSalvos)
  } else {
    const estadoInicial = coletarEstadoInventario()
    ultimoEstadoSalvo = structuredClone(estadoInicial)
    renderItems()
  }

  setSaveStatus('Tudo salvo')
}

async function iniciarApp() {
  try {
    const user = await pegarUsuarioLogado()

    if (user) {
      const usuarioVisual = user.email?.replace('@inventario.local', '') || 'jogador'
      await entrarNoPersonagem(usuarioVisual)
    } else {
      abrirAuth()
      mostrarLoginTela()
    }
  } catch (error) {
    console.error(error)
    abrirAuth()
    mostrarLoginTela()
  }
}

/* =========================================================
   EVENTOS AUTH
========================================================= */

showLoginTab.addEventListener('click', mostrarLoginTela)
showRegisterTab.addEventListener('click', mostrarCadastroTela)
backToLoginBtn.addEventListener('click', mostrarLoginTela)

loginBtn.addEventListener('click', async () => {
  try {
    limparMensagem()
    setLoading(loginBtn, true, 'Entrar')

    const usuario = loginUsuarioInput.value.trim()
    const senha = loginSenhaInput.value.trim()

    if (!usuario || !senha) {
      mostrarMensagem('Preencha usuário e senha.')
      return
    }

    await loginUsuario(usuario, senha)
    await entrarNoPersonagem(usuario)
  } catch (error) {
    console.error(error)
    mostrarMensagem(traduzirErro(error))
  } finally {
    setLoading(loginBtn, false, 'Entrar')
  }
})

registerBtn.addEventListener('click', async () => {
  try {
    limparMensagem()
    setLoading(registerBtn, true, 'Criar conta')

    const usuario = registerUsuarioInput.value.trim()
    const confirmarUsuario = registerConfirmarUsuarioInput.value.trim()
    const senha = registerSenhaInput.value.trim()
    const confirmarSenha = registerConfirmarSenhaInput.value.trim()
    const frase = registerFraseInput.value.trim().toLowerCase()

    if (!usuario || !confirmarUsuario || !senha || !confirmarSenha || !frase) {
      mostrarMensagem('Preencha todos os campos do cadastro.')
      return
    }

    if (usuario.length < 3) {
      mostrarMensagem('O usuário precisa ter pelo menos 3 caracteres.')
      return
    }

    if (usuario !== confirmarUsuario) {
      mostrarMensagem('Os usuários não coincidem.')
      return
    }

    if (senha.length < 6) {
      mostrarMensagem('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (senha !== confirmarSenha) {
      mostrarMensagem('As senhas não coincidem.')
      return
    }

    if (frase !== 'quero criar minha conta') {
      mostrarMensagem('Digite exatamente: quero criar minha conta')
      return
    }

    if (!registerConfirmacaoInput.checked) {
      mostrarMensagem('Confirme que deseja criar a conta.')
      return
    }

    await cadastrarUsuario(usuario, senha)

    registerUsuarioInput.value = ''
    registerConfirmarUsuarioInput.value = ''
    registerSenhaInput.value = ''
    registerConfirmarSenhaInput.value = ''
    registerFraseInput.value = ''
    registerConfirmacaoInput.checked = false

    mostrarMensagem('Conta criada com sucesso. Faça login agora.', false)

    setTimeout(() => {
      mostrarLoginTela()
      loginUsuarioInput.value = usuario
      loginSenhaInput.focus()
    }, 800)
  } catch (error) {
    console.error(error)
    mostrarMensagem(traduzirErro(error))
  } finally {
    setLoading(registerBtn, false, 'Criar conta')
  }
})

logoutBtn.addEventListener('click', async () => {
  try {
    await salvarSeMudou()
    await logoutUsuario()

    abrirAuth()
    mostrarLoginTela()
    loginSenhaInput.value = ''
    mostrarMensagem('Você saiu da conta.', false)
  } catch (error) {
    console.error(error)
    alert(traduzirErro(error))
  }
})

/* =========================================================
   EVENTOS INVENTÁRIO
========================================================= */

addItemBtn.addEventListener('click', adicionarItem)

itemNameInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    adicionarItem()
  }
})

;[
  characterNameInput,
  characterClassInput,
  characterLevelInput,
  strengthInput,
  notesInput
].forEach(el => {
  el.addEventListener('input', agendarAutoSave)
})

loginSenhaInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') loginBtn.click()
})

registerConfirmarSenhaInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') registerBtn.click()
})

togglePasswordButtons.forEach(button => {
  button.addEventListener('click', () => {
    alternarSenha(button.dataset.target)
  })
})

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'hidden') {
    await salvarSeMudou()
  }
})

window.addEventListener('beforeunload', () => {
  clearTimeout(autoSaveTimer)
})

/* =========================================================
   INÍCIO
========================================================= */

iniciarApp()
