let words=JSON.parse(localStorage.getItem('lexus_blocked_words')||'[]');
function save(){localStorage.setItem('lexus_blocked_words',JSON.stringify(words))}
function render(){document.getElementById('wordCount').textContent=words.length;document.getElementById('wordList').innerHTML=words.length?words.map((w,i)=>`<div class="word-item"><b>${w.replace(/[<>]/g,'')}</b><button onclick="removeWord(${i})">Delete</button></div>`).join(''):'<p class="muted">No blocked words yet.</p>'}
function addWord(){const x=document.getElementById('wordInput'),w=x.value.trim();if(!w)return;if(!words.includes(w)){words.push(w);save();render();x.value=''}else alert('Word already exists.')}
function removeWord(i){words.splice(i,1);save();render()}
function demo(){alert('Demo UI: backend endpoint belum disambungkan.')}
function route(){let id=location.hash.slice(1)||'overview';document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+id))}
window.addEventListener('hashchange',route);document.addEventListener('DOMContentLoaded',()=>{route();render()})