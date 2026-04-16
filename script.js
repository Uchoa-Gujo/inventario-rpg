import { supabase } from './supabase.js'

/* =========================================================
   AUTENTICAÇÃO
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
const registerSenhaInput = document.getElementById('registerSenha')
const registerConfirmarSenhaInput = document.getElementById('registerConfirmarSenha')
const registerBtn = document.getElementById('registerBtn')
const backToLoginBtn = document.getElementById('backToLoginBtn')

const logoutBtn = document.getElementById('logoutBtn')
const loggedUserText = document.getElementById('loggedUserText')

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
  authMessage.style.color = isError ? '#ff8f8f' : '#7dffb4'
}

function limparMensagem() {
  authMessage.textContent = ''
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
  loggedUserText.textContent = usuarioVisual ? `Usuário: ${usuarioVisual}` : ''
}

function abrirAuth() {
  appScreen.classList.add('hidden')
  authScreen.classList.remove('hidden')
}

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
   SALVAR / CARREGAR INVENTÁRIO
   Aqui deixei pronto para usar com o seu inventário atual.
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

    if (error) console.error('Erro ao atualizar inventário:', error)
  } else {
    const { error } = await supabase
      .from('inventarios')
      .insert({
        user_id: user.id,
        dados: estado
      })

    if (error) console.error('Erro ao criar inventário:', error)
  }
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

let autoSaveTimer = null

function agendarAutoSave() {
  clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    salvarInventarioNoBanco()
  }, 800)
}

function coletarEstadoInventario() {
  const estado = {
    // AJUSTE ESTES CAMPOS PARA BATER COM AS SUAS VARIÁVEIS REAIS
    strength: typeof strengthInput !== 'undefined' ? strengthInput.value : null,
    items: typeof items !== 'undefined' ? items : [],
    equippedItems: typeof equippedItems !== 'undefined' ? equippedItems : {},
    shelfItems: typeof shelfItems !== 'undefined' ? shelfItems : [],
    selectedItemId: typeof selectedItemId !== 'undefined' ? selectedItemId : null
  }

  return structuredClone(estado)
}

function aplicarEstadoInventario(dados) {
  if (!dados) return

  if (typeof strengthInput !== 'undefined' && dados.strength != null) {
    strengthInput.value = dados.strength
  }

  if (typeof items !== 'undefined' && Array.isArray(dados.items)) {
    items.length = 0
    items.push(...dados.items)
  }

  if (typeof equippedItems !== 'undefined' && dados.equippedItems && typeof dados.equippedItems === 'object') {
    Object.keys(equippedItems).forEach(k => delete equippedItems[k])
    Object.assign(equippedItems, dados.equippedItems)
  }

  if (typeof shelfItems !== 'undefined' && Array.isArray(dados.shelfItems)) {
    shelfItems.length = 0
    shelfItems.push(...dados.shelfItems)
  }

  if (typeof selectedItemId !== 'undefined') {
    selectedItemId = dados.selectedItemId ?? null
  }

  if (typeof render === 'function') {
    render()
  }
}

/* =========================================================
   EVENTOS DA TELA DE AUTH
========================================================= */

showLoginTab.addEventListener('click', mostrarLoginTela)
showRegisterTab.addEventListener('click', mostrarCadastroTela)
backToLoginBtn.addEventListener('click', mostrarLoginTela)

registerBtn.addEventListener('click', async () => {
  try {
    limparMensagem()

    const usuario = registerUsuarioInput.value.trim()
    const senha = registerSenhaInput.value.trim()
    const confirmar = registerConfirmarSenhaInput.value.trim()

    if (!usuario || !senha || !confirmar) {
      mostrarMensagem('Preencha todos os campos.')
      return
    }

    if (usuario.length < 3) {
      mostrarMensagem('O usuário precisa ter pelo menos 3 caracteres.')
      return
    }

    if (senha.length < 6) {
      mostrarMensagem('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (senha !== confirmar) {
      mostrarMensagem('As senhas não coincidem.')
      return
    }

    await cadastrarUsuario(usuario, senha)

    mostrarMensagem('Conta criada com sucesso. Faça login agora.', false)

    registerUsuarioInput.value = ''
    registerSenhaInput.value = ''
    registerConfirmarSenhaInput.value = ''

    setTimeout(() => {
      mostrarLoginTela()
      loginUsuarioInput.value = usuario
      loginSenhaInput.focus()
      mostrarMensagem('Conta criada com sucesso. Faça login agora.', false)
    }, 900)
  } catch (error) {
    console.error(error)
    mostrarMensagem(error.message || 'Erro ao criar conta.')
  }
})

loginBtn.addEventListener('click', async () => {
  try {
    limparMensagem()

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
    mostrarMensagem(error.message || 'Erro ao entrar.')
  }
})

logoutBtn.addEventListener('click', async () => {
  try {
    await logoutUsuario()
    abrirAuth()
    mostrarLoginTela()
    loginSenhaInput.value = ''
    mostrarMensagem('Você saiu da conta.', false)
  } catch (error) {
    console.error(error)
    alert(error.message || 'Erro ao sair.')
  }
})

/* =========================================================
   FLUXO PÓS-LOGIN
========================================================= */

async function entrarNoPersonagem(usuarioVisual) {
  abrirApp(usuarioVisual)

  const dadosSalvos = await carregarInventarioDoBanco()
  if (dadosSalvos) {
    aplicarEstadoInventario(dadosSalvos)
  }

}

/* =========================================================
   CHECAR SESSÃO AO ABRIR
========================================================= */

async function iniciarApp() {
  try {
    const user = await pegarUsuarioLogado()

    if (user) {
      const usuarioVisual = user.email ? user.email.replace('@inventario.local', '') : ''
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
window.login = login
window.cadastrar = cadastrar
window.mostrarCadastro = mostrarCadastro
window.mostrarLogin = mostrarLogin
}

iniciarApp()
