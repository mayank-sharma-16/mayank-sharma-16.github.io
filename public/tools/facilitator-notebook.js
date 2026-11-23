const DB_NAME = "recovery-session-notes";
const DB_VERSION = 1;

const SELECTED_SESSION_KEY = "recovery-selected-session";
const SELECTED_MEMBER_KEY = "recovery-selected-member";

let db;
let currentSession = null;
let currentMemberId = null;
let pendingEntryType = null;
let pendingFeeling = null;

/* =========================================
   Utilities
========================================= */

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2);
}

function nowISO() {
  return new Date().toISOString();
}

function localDate() {
  const d = new Date();

  return new Date(
    d - d.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 10);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, match => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[match]));
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDate(date) {
  if (!date) return "";

  const d = new Date(`${date}T00:00:00`);

  return d.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function saveSelection() {
  if (currentSession) {
    localStorage.setItem(
      SELECTED_SESSION_KEY,
      currentSession.id
    );
  }

  if (currentMemberId) {
    localStorage.setItem(
      SELECTED_MEMBER_KEY,
      currentMemberId
    );
  } else {
    localStorage.removeItem(
      SELECTED_MEMBER_KEY
    );
  }
}

/* =========================================
   IndexedDB
========================================= */

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains("sessions")) {
        database.createObjectStore("sessions", {
          keyPath: "id"
        });
      }

      if (!database.objectStoreNames.contains("members")) {
        const store = database.createObjectStore(
          "members",
          { keyPath: "id" }
        );

        store.createIndex(
          "sessionId",
          "sessionId"
        );
      }

      if (!database.objectStoreNames.contains("entries")) {
        const store = database.createObjectStore(
          "entries",
          { keyPath: "id" }
        );

        store.createIndex(
          "memberId",
          "memberId"
        );

        store.createIndex(
          "sessionId",
          "sessionId"
        );
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function tx(store, mode = "readonly") {
  return db
    .transaction(store, mode)
    .objectStore(store);
}

function put(store, object) {
  return new Promise((resolve, reject) => {
    const request = tx(
      store,
      "readwrite"
    ).put(object);

    request.onsuccess = () =>
      resolve(request.result);

    request.onerror = () =>
      reject(request.error);
  });
}

function get(store, id) {
  return new Promise((resolve, reject) => {
    const request = tx(store).get(id);

    request.onsuccess = () =>
      resolve(request.result);

    request.onerror = () =>
      reject(request.error);
  });
}

function getAll(store, index, value) {
  return new Promise((resolve, reject) => {
    const storeObject = tx(store);

    const request = index
      ? storeObject
          .index(index)
          .getAll(value)
      : storeObject.getAll();

    request.onsuccess = () =>
      resolve(request.result);

    request.onerror = () =>
      reject(request.error);
  });
}

function del(store, id) {
  return new Promise((resolve, reject) => {
    const request = tx(
      store,
      "readwrite"
    ).delete(id);

    request.onsuccess = () =>
      resolve();

    request.onerror = () =>
      reject(request.error);
  });
}

/* =========================================
   Startup
========================================= */

async function init() {
  await openDB();

  const sessions = await getAll("sessions");

  sortSessions(sessions);

  if (!sessions.length) {
    renderWelcome();
    openNewSession();
    return;
  }

  const savedSessionId =
    localStorage.getItem(
      SELECTED_SESSION_KEY
    );

  currentSession =
    sessions.find(
      session => session.id === savedSessionId
    ) || sessions[0];

  const savedMemberId =
    localStorage.getItem(
      SELECTED_MEMBER_KEY
    );

  const members = await getAll(
    "members",
    "sessionId",
    currentSession.id
  );

  if (
    savedMemberId &&
    members.some(
      member => member.id === savedMemberId
    )
  ) {
    currentMemberId = savedMemberId;
  } else {
    currentMemberId = null;
  }

  saveSelection();

  await render();
}

function sortSessions(sessions) {
  sessions.sort((a, b) =>
    (b.date || b.createdAt).localeCompare(
      a.date || a.createdAt
    )
  );
}

/* =========================================
   Rendering
========================================= */

function renderWelcome() {
  document.getElementById("app").innerHTML = `
    <div class="panel">
      <div class="empty">
        <h2>No sessions</h2>

        <p>
          Create a session to begin recording
          member notes.
        </p>

        <button
          class="primary"
          onclick="openNewSession()">
          New session
        </button>
      </div>
    </div>
  `;
}

async function render() {
  if (!currentSession) {
    renderWelcome();
    return;
  }

  saveSelection();

  const sessions = await getAll("sessions");
  sortSessions(sessions);

  const members = await getAll(
    "members",
    "sessionId",
    currentSession.id
  );

  members.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  document.getElementById("app").innerHTML = `
    <div class="session-bar no-print">

      <strong>
        ${esc(
          currentSession.name ||
          "Recovery group"
        )}
      </strong>

      <span class="muted">
        ${esc(
          formatDate(currentSession.date)
        )}
      </span>

      ${
        currentSession.topic
          ? `
            <span class="badge">
              ${esc(currentSession.topic)}
            </span>
          `
          : ""
      }

      <span class="status">
        Saved locally
      </span>

    </div>

    <div class="grid">

      <aside class="panel session-panel no-print">

        <div class="panel-head">
          <h2>Sessions</h2>
          <span class="badge">
            ${sessions.length}
          </span>
        </div>

        <div class="session-actions">
          <button
            class="small primary"
            onclick="openNewSession()">
            + New session
          </button>

          <button
            class="small danger"
            onclick="deleteCurrentSession()">
            Delete
          </button>
        </div>

        <div id="sessionList">
          ${
            sessions.length
              ? sessions
                  .map(sessionHTML)
                  .join("")
              : `
                <div class="empty">
                  No sessions.
                </div>
              `
          }
        </div>

      </aside>

      <aside class="panel member-panel no-print">

        <div class="panel-head">
          <h2>Members</h2>

          <button
            class="small primary"
            onclick="addMember()">
            + Add
          </button>
        </div>

        <div id="memberList">
          ${
            members.length
              ? members
                  .map(memberHTML)
                  .join("")
              : `
                <div class="empty">
                  No members yet.
                </div>
              `
          }
        </div>

      </aside>

      <main class="panel profile-panel">

        ${
          currentMemberId
            ? await profileHTML(
                currentMemberId
              )
            : `
              <div class="empty">
                <h2>Select a member</h2>

                <p>
                  Add a member or select one
                  from the list.
                </p>
              </div>
            `
        }

      </main>

    </div>
  `;
}

function sessionHTML(session) {
  return `
    <div
      class="session ${
        session.id === currentSession.id
          ? "active"
          : ""
      }"
      onclick="selectSession('${session.id}')">

      <div class="session-name">
        ${esc(
          session.name ||
          "Recovery group"
        )}
      </div>

      <div class="session-meta">
        ${esc(
          formatDate(session.date)
        )}

        ${
          session.facilitator
            ? ` · ${esc(
                session.facilitator
              )}`
            : ""
        }
      </div>

      ${
        session.topic
          ? `
            <span class="session-topic">
              ${esc(session.topic)}
            </span>
          `
          : ""
      }

    </div>
  `;
}

function memberHTML(member) {
  return `
    <div class="member ${
      member.id === currentMemberId
        ? "active"
        : ""
    }">

      <div
        class="member-name"
        onclick="selectMember('${member.id}')">

        ${esc(member.name)}

      </div>

      <div class="member-actions no-print">

        <button
          class="small"
          title="Add note"
          onclick="quickNote('${member.id}')">
          +
        </button>

        <button
          class="small danger"
          title="Delete member"
          onclick="deleteMember('${member.id}')">
          ×
        </button>

      </div>

    </div>
  `;
}

async function profileHTML(id) {
  const member = await get(
    "members",
    id
  );

  if (!member) {
    currentMemberId = null;

    return `
      <div class="empty">
        Member not found.
      </div>
    `;
  }

  const entries = await getAll(
    "entries",
    "memberId",
    id
  );

  entries.sort((a, b) =>
    a.createdAt.localeCompare(
      b.createdAt
    )
  );

  return `
    <div class="panel-body">

      <div class="profile-top">

        <div>
          <div class="profile-name">
            ${esc(member.name)}
          </div>

          <div class="muted">
            ${esc(
              member.attendance ||
              "Present"
            )}
          </div>
        </div>

        <div class="actions no-print">

          <button
            class="small"
            onclick="editMember('${member.id}')">
            Edit
          </button>

          <button
            class="small"
            onclick="addEntry('${member.id}', 'note')">
            + Note
          </button>

        </div>

      </div>

      <div class="quick-grid no-print">

        <button
          onclick="addEntry('${member.id}', 'feeling')">
          😊<br>Feeling
        </button>

        <button
          onclick="addEntry('${member.id}', 'urge')">
          ⚡<br>Urge 1–10
        </button>

        <button
          onclick="addEntry('${member.id}', 'participation')">
          💬<br>Participation
        </button>

        <button
          onclick="addEntry('${member.id}', 'followup')">
          ↗<br>Follow-up
        </button>

      </div>

      <div class="actions no-print" style="margin-bottom:15px">

        <button
          class="small"
          onclick="addEntry('${member.id}', 'attendance')">
          Attendance
        </button>

        <button
          class="small"
          onclick="addEntry('${member.id}', 'goal')">
          Goal
        </button>

        <button
          class="small"
          onclick="addEntry('${member.id}', 'flag')">
          Flag
        </button>

        <button
          class="small"
          onclick="addEntry('${member.id}', 'custom')">
          Other
        </button>

      </div>

      <div class="entries">

        ${
          entries.length
            ? entries
                .map(entryHTML)
                .join("")
            : `
              <div class="empty">
                No entries for this session.
              </div>
            `
        }

      </div>

    </div>
  `;
}

function entryHTML(entry) {
  let content = esc(
    entry.text || ""
  );

  if (entry.type === "urge") {
    content =
      `<strong>${esc(
        entry.value
      )}/10</strong>` +
      (
        entry.text
          ? ` — ${esc(entry.text)}`
          : ""
      );
  }

  if (entry.type === "feeling") {
    content =
      `<strong>${esc(
        entry.feeling
      )}</strong>` +
      (
        entry.text
          ? ` — ${esc(entry.text)}`
          : ""
      );
  }

  return `
    <div class="entry">

      <div class="entry-time">
        ${formatTime(entry.createdAt)}
      </div>

      <div class="entry-type">
        ${esc(
          labelType(entry.type)
        )}
      </div>

      <div class="entry-content">
        ${content}
      </div>

      <button
        class="entry-delete no-print"
        onclick="deleteEntry('${entry.id}')">
        ×
      </button>

    </div>
  `;
}

function labelType(type) {
  return {
    feeling: "Feeling",
    urge: "Urge",
    participation: "Participation",
    followup: "Follow-up",
    attendance: "Attendance",
    goal: "Goal",
    flag: "Flag",
    note: "Note",
    custom: "Other"
  }[type] || type;
}

/* =========================================
   Sessions
========================================= */

async function selectSession(id) {
  const session = await get(
    "sessions",
    id
  );

  if (!session) return;

  currentSession = session;
  currentMemberId = null;

  localStorage.setItem(
    SELECTED_SESSION_KEY,
    session.id
  );

  localStorage.removeItem(
    SELECTED_MEMBER_KEY
  );

  await render();
}

async function deleteCurrentSession() {
  if (!currentSession) return;

  const members = await getAll(
    "members",
    "sessionId",
    currentSession.id
  );

  const confirmed = confirm(
    `Delete the session "${currentSession.name}" ` +
    `from ${formatDate(currentSession.date)}?\n\n` +
    `${members.length} member profile(s) and all ` +
    `entries belonging to this session will also ` +
    `be deleted.`
  );

  if (!confirmed) return;

  for (const member of members) {
    const entries = await getAll(
      "entries",
      "memberId",
      member.id
    );

    for (const entry of entries) {
      await del(
        "entries",
        entry.id
      );
    }

    await del(
      "members",
      member.id
    );
  }

  await del(
    "sessions",
    currentSession.id
  );

  localStorage.removeItem(
    SELECTED_SESSION_KEY
  );

  localStorage.removeItem(
    SELECTED_MEMBER_KEY
  );

  const sessions = await getAll(
    "sessions"
  );

  sortSessions(sessions);

  if (sessions.length) {
    currentSession = sessions[0];
    currentMemberId = null;

    saveSelection();

    await render();
  } else {
    currentSession = null;
    currentMemberId = null;

    renderWelcome();
    openNewSession();
  }
}

function openNewSession() {
  document.getElementById(
    "sessionDate"
  ).value = localDate();

  document.getElementById(
    "sessionFacilitator"
  ).value = "";

  document.getElementById(
    "sessionName"
  ).value = "";

  document.getElementById(
    "sessionTopic"
  ).value = "";

  openModal("sessionModal");
}

async function createSession() {
  const session = {
    id: uid(),

    date:
      document.getElementById(
        "sessionDate"
      ).value || localDate(),

    facilitator:
      document.getElementById(
        "sessionFacilitator"
      ).value.trim(),

    name:
      document.getElementById(
        "sessionName"
      ).value.trim() ||
      "Recovery group",

    topic:
      document.getElementById(
        "sessionTopic"
      ).value.trim(),

    createdAt: nowISO()
  };

  await put(
    "sessions",
    session
  );

  currentSession = session;
  currentMemberId = null;

  saveSelection();

  closeModal("sessionModal");

  await render();
}

/* =========================================
   Members
========================================= */

async function selectMember(id) {
  const member = await get(
    "members",
    id
  );

  if (
    !member ||
    member.sessionId !==
      currentSession.id
  ) {
    return;
  }

  currentMemberId = id;

  localStorage.setItem(
    SELECTED_MEMBER_KEY,
    id
  );

  await render();
}

async function addMember() {
  const name = prompt(
    "Member name"
  );

  if (!name?.trim()) return;

  const member = {
    id: uid(),
    sessionId: currentSession.id,
    name: name.trim(),
    attendance: "Present",
    createdAt: nowISO()
  };

  await put(
    "members",
    member
  );

  currentMemberId = member.id;

  saveSelection();

  await render();
}

async function editMember(id) {
  const member = await get(
    "members",
    id
  );

  if (!member) return;

  const name = prompt(
    "Member name",
    member.name
  );

  if (!name?.trim()) return;

  member.name = name.trim();

  await put(
    "members",
    member
  );

  await render();
}

async function deleteMember(id) {
  const member = await get(
    "members",
    id
  );

  if (!member) return;

  const confirmed = confirm(
    `Delete ${member.name} and all session ` +
    `entries for this member?`
  );

  if (!confirmed) return;

  const entries = await getAll(
    "entries",
    "memberId",
    id
  );

  for (const entry of entries) {
    await del(
      "entries",
      entry.id
    );
  }

  await del(
    "members",
    id
  );

  if (currentMemberId === id) {
    currentMemberId = null;

    localStorage.removeItem(
      SELECTED_MEMBER_KEY
    );
  }

  await render();
}

/* =========================================
   Entries
========================================= */

async function addEntry(memberId, type) {
  pendingEntryType = type;

  if (type === "feeling") {
    pendingFeeling = null;

    currentMemberId = memberId;

    document.getElementById(
      "selectedFeeling"
    ).textContent = "";

    document.getElementById(
      "feelingDetail"
    ).value = "";

    document
      .querySelectorAll(".wheel button")
      .forEach(button =>
        button.classList.remove(
          "selected"
        )
      );

    saveSelection();

    openModal(
      "feelingsModal"
    );

    return;
  }

  const titles = {
    urge: "Urge rating",
    participation: "Participation",
    followup: "Follow-up",
    attendance: "Attendance",
    goal: "Goal",
    flag: "Flag",
    note: "Note",
    custom: "Other"
  };

  document.getElementById(
    "entryTitle"
  ).textContent =
    titles[type] || "Add entry";

  document.getElementById(
    "entryBody"
  ).innerHTML =
    entryForm(type);

  document.getElementById(
    "saveEntryBtn"
  ).onclick = () =>
    saveGenericEntry(
      memberId,
      type
    );

  openModal("entryModal");
}

function entryForm(type) {
  if (type === "urge") {
    return `
      <label>Current urge</label>

      <div id="urgeRating">
        ${[1,2,3,4,5,6,7,8,9,10]
          .map(number => `
            <button
              type="button"
              onclick="chooseRating(${number})">
              ${number}
            </button>
          `)
          .join("")}
      </div>

      <input
        type="hidden"
        id="entryValue">

      <div class="field-spacer">
        <label for="entryText">
          Optional note
        </label>

        <textarea
          id="entryText"
          placeholder="What was happening?"></textarea>
      </div>
    `;
  }

  if (type === "participation") {
    return `
      <label for="entryText">
        Participation
      </label>

      <select id="entryText">
        <option>Minimal</option>
        <option>Moderate</option>
        <option>High</option>
        <option>Shared personal experience</option>
        <option>Asked a question</option>
        <option>Offered support</option>
        <option>Completed activity</option>
      </select>
    `;
  }

  if (type === "attendance") {
    return `
      <label for="entryText">
        Status
      </label>

      <select id="entryText">
        <option>Present</option>
        <option>Late</option>
        <option>Left early</option>
        <option>Absent</option>
      </select>
    `;
  }

  return `
    <label for="entryText">
      ${labelType(type)}
    </label>

    <textarea
      id="entryText"
      placeholder="${
        type === "followup"
          ? "What needs follow-up?"
          : type === "goal"
            ? "Goal or commitment"
            : type === "flag"
              ? "Something to flag for follow-up"
              : "Write a note..."
      }"></textarea>
  `;
}

function chooseRating(number) {
  document.getElementById(
    "entryValue"
  ).value = number;

  document
    .querySelectorAll(
      "#urgeRating button"
    )
    .forEach((button, index) => {
      button.classList.toggle(
        "selected",
        index + 1 === number
      );
    });
}

async function saveGenericEntry(
  memberId,
  type
) {
  const value =
    document.getElementById(
      "entryValue"
    )?.value || "";

  const text =
    document.getElementById(
      "entryText"
    )?.value || "";

  if (type === "urge" && !value) {
    alert(
      "Choose a rating from 1–10."
    );
    return;
  }

  if (
    !text.trim() &&
    type !== "urge"
  ) {
    alert(
      "Enter something first."
    );
    return;
  }

  await put("entries", {
    id: uid(),
    sessionId: currentSession.id,
    memberId,
    type,
    value,
    text: text.trim(),
    createdAt: nowISO()
  });

  closeModal(
    "entryModal"
  );

  await render();
}

async function quickNote(id) {
  await addEntry(
    id,
    "note"
  );
}

async function deleteEntry(id) {
  if (!confirm(
    "Delete this entry?"
  )) {
    return;
  }

  await del(
    "entries",
    id
  );

  await render();
}

/* =========================================
   Feelings
========================================= */

document
  .querySelectorAll(".wheel button")
  .forEach(button => {
    button.addEventListener(
      "click",
      () => {
        document
          .querySelectorAll(
            ".wheel button"
          )
          .forEach(item =>
            item.classList.remove(
              "selected"
            )
          );

        button.classList.add(
          "selected"
        );

        pendingFeeling =
          button.dataset.feeling;

        document.getElementById(
          "selectedFeeling"
        ).textContent =
          pendingFeeling;
      }
    );
  });

document.getElementById(
  "saveFeelingBtn"
).onclick = async () => {
  if (!pendingFeeling) {
    alert(
      "Choose a feeling."
    );
    return;
  }

  if (!currentMemberId) {
    alert(
      "No member selected."
    );
    return;
  }

  await put("entries", {
    id: uid(),
    sessionId:
      currentSession.id,
    memberId:
      currentMemberId,
    type: "feeling",
    feeling:
      pendingFeeling,
    text:
      document.getElementById(
        "feelingDetail"
      ).value.trim(),
    createdAt: nowISO()
  });

  closeModal(
    "feelingsModal"
  );

  await render();
};

/* =========================================
   Modals
========================================= */

function openModal(id) {
  document
    .getElementById(id)
    .classList.add("open");
}

function closeModal(id) {
  document
    .getElementById(id)
    .classList.remove("open");
}

document
  .querySelectorAll(
    "[data-close-modal]"
  )
  .forEach(button => {
    button.addEventListener(
      "click",
      () => {
        closeModal(
          button.dataset.closeModal
        );
      }
    );
  });

document
  .querySelectorAll(
    ".modal-backdrop"
  )
  .forEach(backdrop => {
    backdrop.addEventListener(
      "click",
      event => {
        if (
          event.target === backdrop
        ) {
          backdrop.classList.remove(
            "open"
          );
        }
      }
    );
  });

document.addEventListener(
  "keydown",
  event => {
    if (event.key !== "Escape") {
      return;
    }

    document
      .querySelectorAll(
        ".modal-backdrop.open"
      )
      .forEach(modal => {
        modal.classList.remove(
          "open"
        );
      });
  }
);

/* =========================================
   Export / PDF
========================================= */

async function exportCurrentSession() {
  if (!currentSession) return;

  const members = await getAll(
    "members",
    "sessionId",
    currentSession.id
  );

  members.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  let memberBlocks = "";

  for (const member of members) {
    const entries = await getAll(
      "entries",
      "memberId",
      member.id
    );

    entries.sort((a, b) =>
      a.createdAt.localeCompare(
        b.createdAt
      )
    );

    memberBlocks += `
      <section
        style="
          break-inside: avoid;
          margin-bottom: 30px;
        ">

        <h2>
          ${esc(member.name)}
        </h2>

        <p>
          <strong>Attendance:</strong>
          ${esc(
            member.attendance ||
            "Present"
          )}
        </p>

        ${
          entries.length
            ? `
              <table
                style="
                  width: 100%;
                  border-collapse: collapse;
                ">

                <thead>
                  <tr>
                    <th
                      style="
                        text-align: left;
                        border-bottom: 1px solid #999;
                        padding: 6px;
                      ">
                      Time
                    </th>

                    <th
                      style="
                        text-align: left;
                        border-bottom: 1px solid #999;
                        padding: 6px;
                      ">
                      Type
                    </th>

                    <th
                      style="
                        text-align: left;
                        border-bottom: 1px solid #999;
                        padding: 6px;
                      ">
                      Entry
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${entries
                    .map(exportEntryHTML)
                    .join("")}
                </tbody>

              </table>
            `
            : "<p>No entries.</p>"
        }

      </section>
    `;
  }

  const oldHTML =
    document.body.innerHTML;

  document.body.innerHTML = `
    <div
      style="
        font: 12px/1.45 system-ui, sans-serif;
        color: #111;
        padding: 30px;
      ">

      <h1>
        ${esc(currentSession.name)}
      </h1>

      <p>
        <strong>Date:</strong>
        ${esc(
          formatDate(
            currentSession.date
          )
        )}

        ${
          currentSession.facilitator
            ? `
              &nbsp;
              <strong>Facilitator:</strong>
              ${esc(
                currentSession.facilitator
              )}
            `
            : ""
        }
      </p>

      ${
        currentSession.topic
          ? `
            <p>
              <strong>Topic:</strong>
              ${esc(
                currentSession.topic
              )}
            </p>
          `
          : ""
      }

      <hr>

      ${
        memberBlocks ||
        "<p>No members.</p>"
      }

    </div>
  `;

  window.print();

  document.body.innerHTML =
    oldHTML;

  await render();
}async function exportCurrentSession() {
  if (!currentSession) return;

  const members = await getAll(
    "members",
    "sessionId",
    currentSession.id
  );

  members.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  let memberBlocks = "";

  for (const member of members) {
    const entries = await getAll(
      "entries",
      "memberId",
      member.id
    );

    entries.sort((a, b) =>
      a.createdAt.localeCompare(
        b.createdAt
      )
    );

    memberBlocks += `
      <section class="print-member">

        <h2>
          ${esc(member.name)}
        </h2>

        <p>
          <strong>Attendance:</strong>
          ${esc(
            member.attendance ||
            "Present"
          )}
        </p>

        ${
          entries.length
            ? `
              <table class="print-table">

                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Entry</th>
                  </tr>
                </thead>

                <tbody>
                  ${entries
                    .map(exportEntryHTML)
                    .join("")}
                </tbody>

              </table>
            `
            : "<p>No entries.</p>"
        }

      </section>
    `;
  }

  /*
   * Create a temporary print-only container.
   * Do NOT replace document.body.innerHTML.
   */
  const printContainer =
    document.createElement("div");

  printContainer.id =
    "temporaryPrintContainer";

  printContainer.innerHTML = `
    <div class="print-document">

      <h1>
        ${esc(
          currentSession.name ||
          "Recovery group"
        )}
      </h1>

      <p>
        <strong>Date:</strong>
        ${esc(
          formatDate(
            currentSession.date
          )
        )}

        ${
          currentSession.facilitator
            ? `
              &nbsp;
              <strong>Facilitator:</strong>
              ${esc(
                currentSession.facilitator
              )}
            `
            : ""
        }
      </p>

      ${
        currentSession.topic
          ? `
            <p>
              <strong>Topic:</strong>
              ${esc(
                currentSession.topic
              )}
            </p>
          `
          : ""
      }

      <hr>

      ${
        memberBlocks ||
        "<p>No members.</p>"
      }

    </div>
  `;

  document.body.appendChild(
    printContainer
  );

  /*
   * Hide the normal application while printing.
   */
  document
    .querySelector(".app")
    .classList.add("printing");

  /*
   * Wait until the browser has rendered the
   * temporary print content before opening print.
   */
  await new Promise(resolve =>
    requestAnimationFrame(resolve)
  );

  window.print();

  /*
   * Remove only the temporary print content.
   * The original application DOM and all of its
   * event listeners remain intact.
   */
  printContainer.remove();

  document
    .querySelector(".app")
    .classList.remove("printing");
}

async function exportAllSessions() {
  const sessions = await getAll("sessions");

  if (!sessions.length) {
    alert("There are no sessions to export.");
    return;
  }

  sortSessions(sessions);

  let sessionBlocks = "";

  for (const session of sessions) {
    const members = await getAll(
      "members",
      "sessionId",
      session.id
    );

    members.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    let memberBlocks = "";

    for (const member of members) {
      const entries = await getAll(
        "entries",
        "memberId",
        member.id
      );

      entries.sort((a, b) =>
        a.createdAt.localeCompare(
          b.createdAt
        )
      );

      memberBlocks += `
        <section class="print-member">

          <h2>
            ${esc(member.name)}
          </h2>

          <p>
            <strong>Attendance:</strong>
            ${esc(
              member.attendance ||
              "Present"
            )}
          </p>

          ${
            entries.length
              ? `
                <table class="print-table">

                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Entry</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${entries
                      .map(exportEntryHTML)
                      .join("")}
                  </tbody>

                </table>
              `
              : "<p>No entries.</p>"
          }

        </section>
      `;
    }

    sessionBlocks += `
      <section class="print-session">

        <h1>
          ${esc(
            session.name ||
            "Recovery group"
          )}
        </h1>

        <p>
          <strong>Date:</strong>
          ${esc(
            formatDate(session.date)
          )}

          ${
            session.facilitator
              ? `
                &nbsp;
                <strong>Facilitator:</strong>
                ${esc(
                  session.facilitator
                )}
              `
              : ""
          }
        </p>

        ${
          session.topic
            ? `
              <p>
                <strong>Topic:</strong>
                ${esc(session.topic)}
              </p>
            `
            : ""
        }

        <hr>

        ${
          memberBlocks ||
          "<p>No members.</p>"
        }

      </section>
    `;
  }

  const printContainer =
    document.createElement("div");

  printContainer.id =
    "temporaryPrintContainer";

  printContainer.innerHTML = `
    <div class="print-document">
      ${sessionBlocks}
    </div>
  `;

  document.body.appendChild(
    printContainer
  );

  document
    .querySelector(".app")
    .classList.add("printing");

  await new Promise(resolve =>
    requestAnimationFrame(resolve)
  );

  window.print();

  printContainer.remove();

  document
    .querySelector(".app")
    .classList.remove("printing");
}


function exportEntryHTML(entry) {
  let content = "";

  if (entry.type === "urge") {
    content =
      `${esc(entry.value)}/10` +
      (
        entry.text
          ? ` — ${esc(entry.text)}`
          : ""
      );
  } else if (
    entry.type === "feeling"
  ) {
    content =
      `${esc(entry.feeling)}` +
      (
        entry.text
          ? ` — ${esc(entry.text)}`
          : ""
      );
  } else {
    content = esc(
      entry.text
    );
  }

  return `
    <tr>

      <td
        style="
          padding: 6px;
          border-bottom: 1px solid #ddd;
        ">
        ${formatTime(
          entry.createdAt
        )}
      </td>

      <td
        style="
          padding: 6px;
          border-bottom: 1px solid #ddd;
        ">
        ${esc(
          labelType(entry.type)
        )}
      </td>

      <td
        style="
          padding: 6px;
          border-bottom: 1px solid #ddd;
          white-space: pre-wrap;
        ">
        ${content}
      </td>

    </tr>
  `;
}

/* =========================================
   Application events
========================================= */

document.getElementById(
  "newSessionBtn"
).addEventListener(
  "click",
  openNewSession
);

document.getElementById(
  "createSessionBtn"
).addEventListener(
  "click",
  createSession
);

document.getElementById(
  "exportBtn"
).addEventListener(
  "click",
  exportCurrentSession
);

document.getElementById(
  "exportAllBtn"
).addEventListener(
  "click",
  exportAllSessions
);


/* =========================================
   Start application
========================================= */

init();
