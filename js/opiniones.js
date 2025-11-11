document.addEventListener("DOMContentLoaded", async () => {
    const estrellas = document.querySelectorAll(".estrella");
    const opinionForm = document.getElementById("opinionForm");
    const opinionesList = document.getElementById("opinionesList");
    let idClienteInput = document.getElementById("id_cliente");
    let calificacionSeleccionada = 0;

    try {
        const res = await fetch("/api/auth/usuario");
        if (res.ok) {
            const usuario = await res.json();
            idClienteInput.value = usuario.id_usuario;
        } else {
            idClienteInput.value = 0;
        }
    } catch {
        idClienteInput.value = 0;
    }

    estrellas.forEach(estrella => {
        estrella.addEventListener("mouseover", () =>
            pintarEstrellas(estrella.dataset.value)
        );

        estrella.addEventListener("mouseout", () =>
            pintarEstrellas(calificacionSeleccionada)
        );

        estrella.addEventListener("click", () => {
            calificacionSeleccionada = estrella.dataset.value;
        });
    });

    function pintarEstrellas(valor) {
        estrellas.forEach(e => e.classList.remove("seleccionada"));
        estrellas.forEach(e => {
            if (e.dataset.value <= valor) e.classList.add("seleccionada");
        });
    }

    opinionForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = {
            id_producto: document.getElementById("id_producto").value,
            id_cliente: idClienteInput.value,
            calificacion: calificacionSeleccionada,
            comentario: document.getElementById("comentario").value
        };

        const res = await fetch("/api/opiniones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!res.ok) return alert("Error al guardar opinión");

        opinionForm.reset();
        calificacionSeleccionada = 0;
        pintarEstrellas(0);

        obtenerOpiniones();
    });

 async function obtenerOpiniones() {
    const id_producto = document.getElementById("id_producto").value;
    const res = await fetch(`/api/opiniones/producto/${id_producto}`);

    const data = await res.json();

    if (!data.success) {
        console.error("Error al obtener opiniones");
        return;
    }

    const opiniones = data.opiniones;
    opinionesList.innerHTML = "";

    if (opiniones.length === 0) {
        opinionesList.innerHTML = `
        <p class="text-gray-600 text-center p-4 border border-gray-300 rounded-xl">
            Aún no hay opiniones. Sé el primero en comentar.
        </p>`;
        return;
    }

    opiniones.forEach(op => {
        opinionesList.innerHTML += `
            <div class="bg-white p-5 rounded-xl shadow-lg border border-gray-200 hover:scale-[1.01] transition">
                <div class="flex items-center mb-2 text-yellow-400 text-2xl font-bold">
                    ${"★".repeat(op.calificacion)}
                </div>

                <p class="text-gray-700 mb-2">${op.comentario}</p>

                <p class="text-sm text-gray-500">
                    ${op.nombre_cliente ? op.nombre_cliente : "Cliente"}
                </p>

                <p class="text-xs text-gray-400">
                    ${new Date(op.fecha_opinion).toLocaleDateString()}
                </p>
            </div>
        `;
    });
}

});
