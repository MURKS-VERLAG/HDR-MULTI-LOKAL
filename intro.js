/* Renchtal intro: small boot script, loaded before the main game. */
(()=>{
  'use strict';
  const root=document.getElementById('intro'),video=document.getElementById('intro-video'),stage=document.getElementById('intro-stage'),play=document.getElementById('intro-play'),spinner=document.getElementById('intro-spinner'),enter=document.getElementById('intro-enter'),message=document.getElementById('intro-message'),menu=document.getElementById('menu');
  const music=new Audio('assets/intro/tavern-music.mp3');music.preload='auto';music.volume=1;music.loop=true;
  let started=false,ready=false,passed=false,finished=false,musicStopped=false,videoFailed=false,startAt=0;
  const showReady=()=>{if(started&&ready&&passed&&!finished){spinner.hidden=true;enter.hidden=false;message.textContent='';}};
  function noteReady(){ready=true;showReady();}
  addEventListener('renchtal:menu-ready',noteReady,{once:true});
  function stopMusic(){musicStopped=true;music.pause();music.currentTime=0;video.pause();}
  document.getElementById('singleplayer').addEventListener('click',stopMusic,{capture:true});
  function enterMenu(){if(!started||!ready||!passed||finished)return;finished=true;video.pause();root.classList.add('intro-leaving');menu.removeAttribute('inert');menu.setAttribute('aria-hidden','false');setTimeout(()=>{root.hidden=true;document.getElementById('singleplayer').focus({preventScroll:true});},450);}
  enter.addEventListener('click',enterMenu);
  addEventListener('keydown',event=>{if(finished)return;if(event.code==='Space'){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat){if(!started)play.click();else enterMenu();}}},{capture:true});
  function finishVideo(){stage.classList.add('intro-video-finished');}
  video.addEventListener('ended',()=>{passed=true;showReady();finishVideo();});
  video.addEventListener('timeupdate',()=>{
    if(video.currentTime>=10){passed=true;showReady();}
    // Keep the replacement track aligned with the silent film while it is playing.
    if(started&&!finished&&!video.ended&&!musicStopped&&!music.paused&&Math.abs(music.currentTime-video.currentTime)>.22)music.currentTime=video.currentTime;
  });
  video.addEventListener('error',()=>{videoFailed=true;message.textContent='Video konnte nicht geladen werden. Das Menü wird vorbereitet …';finishVideo();});
  play.addEventListener('click',()=>{
    if(started)return;started=true;startAt=performance.now();play.hidden=true;root.classList.add('intro-started');spinner.hidden=false;
    // Both play() calls run inside the same trusted gesture: no autoplay workaround needed.
    const film=video.play(),song=music.play();
    if(film?.catch)film.catch(()=>{videoFailed=true;finishVideo();});
    if(song?.catch)song.catch(()=>{if(!musicStopped){message.textContent='Ton starten';message.onclick=()=>{music.play().then(()=>{message.textContent='';message.onclick=null;}).catch(()=>{});};}});
    function tick(){if(finished)return;if(video.currentTime>=10||(videoFailed&&performance.now()-startAt>=10000)){passed=true;showReady();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
  });
  // Let the critical intro shell paint before the large game script starts parsing.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const script=document.createElement('script');script.src='game.js?v=84';script.onerror=()=>{message.textContent='Spiel konnte nicht geladen werden. Bitte Seite neu laden.';};document.head.appendChild(script);
  }));
  // The same background declaration as the existing menu, after its stylesheet is ready.
  function copyParchment(){const style=getComputedStyle(menu);root.style.backgroundColor=style.backgroundColor;root.style.backgroundImage=style.backgroundImage;}
  if(document.readyState==='complete')copyParchment();else addEventListener('load',copyParchment,{once:true});
})();
