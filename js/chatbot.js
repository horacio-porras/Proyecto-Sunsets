// Sistema de Chatbot Simple
let chatbotConversation = [];

// Inicializar chatbot
document.addEventListener('DOMContentLoaded', function() {
    const chatbotForm = document.getElementById('chatbotForm');
    const chatbotInput = document.getElementById('chatbotInput');
    
    if (chatbotForm) {
        chatbotForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const pregunta = chatbotInput.value.trim();
            
            if (!pregunta) return;
            
            // Agregar mensaje del usuario
            addMessage(pregunta, 'user');
            chatbotInput.value = '';
            
            // Mostrar indicador de escritura
            showTypingIndicator();
            
            try {
                // Obtener usuario actual si está logueado
                const userData = localStorage.getItem('userData');
                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                let idUsuario = null;
                
                if (userData && token) {
                    try {
                        const user = JSON.parse(userData);
                        idUsuario = user.id;
                    } catch (e) {
                        console.error('Error al parsear userData:', e);
                    }
                }
                
                // Enviar pregunta al servidor
                const response = await fetch('/api/chatbot/ask', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify({
                        pregunta: pregunta,
                        id_usuario: idUsuario
                    })
                });
                
                const data = await response.json();
                
                // Remover indicador de escritura
                removeTypingIndicator();
                
                if (data.success) {
                    // Agregar respuesta del bot
                    addMessage(data.respuesta, 'bot');
                    
                    // Guardar conversación si hay usuario
                    if (idUsuario && data.id_conversacion) {
                        chatbotConversation.push({
                            id: data.id_conversacion,
                            pregunta: pregunta,
                            respuesta: data.respuesta
                        });
                    }
                } else {
                    addMessage('Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta de nuevo.', 'bot');
                }
            } catch (error) {
                console.error('Error al enviar mensaje:', error);
                removeTypingIndicator();
                addMessage('Lo siento, hubo un error de conexión. Por favor, intenta de nuevo más tarde.', 'bot');
            }
        });
    }
    
    // Permitir enviar con Enter
    if (chatbotInput) {
        chatbotInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                chatbotForm.dispatchEvent(new Event('submit'));
            }
        });
    }
});

// Agregar mensaje al chat
function addMessage(texto, tipo) {
    const messagesContainer = document.getElementById('chatbotMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex items-start gap-2 ${tipo === 'user' ? 'flex-row-reverse' : ''}`;
    
    if (tipo === 'user') {
        messageDiv.innerHTML = `
            <div class="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-user text-sm"></i>
            </div>
            <div class="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-3 shadow-sm max-w-[80%]">
                <p>${escapeHtml(texto)}</p>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-robot text-sm"></i>
            </div>
            <div class="bg-white rounded-lg p-3 shadow-sm max-w-[80%]">
                <p class="text-gray-800">${escapeHtml(texto)}</p>
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Mostrar indicador de escritura
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatbotMessages');
    if (!messagesContainer) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'flex items-start gap-2';
    typingDiv.innerHTML = `
        <div class="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-robot text-sm"></i>
        </div>
        <div class="bg-white rounded-lg p-3 shadow-sm">
            <div class="flex gap-1">
                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s"></span>
                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Remover indicador de escritura
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Función global para toggle del chatbot (llamada desde index.html)
window.toggleChatbot = function() {
    const modal = document.getElementById('chatbotModal');
    const button = document.getElementById('chatbotButton');
    
    if (modal) {
        const isHidden = modal.classList.contains('hidden');
        
        if (isHidden) {
            // Abrir modal
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            // Ocultar botón
            if (button) {
                button.style.display = 'none';
            }
            // Enfocar input
            setTimeout(() => {
                document.getElementById('chatbotInput')?.focus();
            }, 100);
        } else {
            // Cerrar modal
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            // Mostrar botón
            if (button) {
                button.style.display = 'flex';
            }
        }
    }
};
